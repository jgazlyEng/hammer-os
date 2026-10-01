import type { BreakdownElementStatus, BreakdownRunStatus, BreakdownTaxonomyCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { readStoredLlmProviderSettings, resolveLlmApiKey } from "@/lib/llm-settings";
import { parseScriptText } from "@/lib/script-parser";
import type { ParsedScriptScene } from "@/lib/types";

export type ProductionBreakdownRunRecord = Prisma.BreakdownRunGetPayload<{
  include: typeof breakdownRunInclude;
}>;

type BreakdownElementDraft = {
  stableKey: string;
  category: BreakdownTaxonomyCategory;
  displayName: string;
  normalizedName: string;
  description?: string;
  evidenceText?: string;
  sourceText?: string;
  firstPageNumber?: number;
  lastPageNumber?: number;
  confidence?: number;
  sortOrder: number;
  metadataJson: Prisma.InputJsonObject;
  tagKeys: Array<{ key: string; value: string; label?: string; color?: string }>;
  scenes: Array<{
    sceneNumber: string;
    sceneHeading: string;
    occurrenceCount: number;
    firstPageNumber?: number;
    lastPageNumber?: number;
    evidenceText?: string;
    notes?: string;
    metadataJson?: Prisma.InputJsonObject;
  }>;
};

type BreakdownSceneDraft = {
  sceneNumber?: string;
  printedNumber?: string;
  page?: number;
  pageEighths?: number;
  intExt?: string;
  location?: string;
  timeOfDay?: string;
  sceneHeading?: string;
  synopsis?: string;
  cast?: string[];
  elementIds: string[];
  evidence?: string;
};

type BreakdownSceneReference = BreakdownSceneDraft & {
  text?: string;
};

type BreakdownSource = {
  parserName: string;
  parserVersion: string;
  elements: BreakdownElementDraft[];
  scenes: BreakdownSceneDraft[];
  warning?: string;
  model?: string;
};

const categoryDepartments: Record<BreakdownTaxonomyCategory, string> = {
  CHARACTER: "cast",
  EXTRAS: "background-casting",
  LOCATION: "locations-art",
  PROP: "props",
  VEHICLE: "transportation-picture-vehicles",
  WARDROBE: "costume",
  SFX: "special-effects",
  ANIMAL: "animal-wrangler-vfx",
  ACTION: "stunts",
  VFX: "vfx",
  NOTE: "production",
  OTHER: "production"
};

export const breakdownRunInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
  elements: {
    include: {
      tags: { include: { tag: true } },
      sceneElements: true
    },
    orderBy: [{ category: "asc" as const }, { sortOrder: "asc" as const }, { displayName: "asc" as const }]
  }
} satisfies Prisma.BreakdownRunInclude;

export async function runProductionBreakdown(input: { documentVersionId: string; userId?: string }) {
  const run = await createProductionBreakdownRun(input);
  return processProductionBreakdownRun(run.id);
}

export async function startProductionBreakdown(input: { documentVersionId: string; userId?: string }) {
  const run = await createProductionBreakdownRun(input);
  setTimeout(() => {
    void processProductionBreakdownRun(run.id).catch(async (error) => {
      await markBreakdownRunFailed(run.id, error);
      console.error("[hammer:breakdown:background]", error);
    });
  }, 0);
  return getBreakdownRun(run.id);
}

async function createProductionBreakdownRun(input: { documentVersionId: string; userId?: string }) {
  const version = await prisma.documentVersion.findUnique({
    where: { id: input.documentVersionId },
    include: { document: true }
  });
  if (!version || version.document.deletedAt) throw new Error("Script version not found.");
  if (!version.document.projectId) throw new Error("Breakdowns can only run on scripts attached to a Development Slate project.");

  const sourceText = version.extractedText?.trim();
  const run = await prisma.breakdownRun.create({
    data: {
      projectId: version.document.projectId,
      documentId: version.documentId,
      documentVersionId: version.id,
      status: "RUNNING",
      parserName: "claude-production-breakdown-skill",
      parserVersion: "pending",
      createdById: input.userId
    }
  });
  return run;
}

async function processProductionBreakdownRun(runId: string) {
  const run = await prisma.breakdownRun.findUnique({
    where: { id: runId },
    include: { documentVersion: { include: { document: true } } }
  });
  if (!run) throw new Error("Breakdown run not found.");
  const version = run.documentVersion;
  const sourceText = version.extractedText?.trim();
  if (!sourceText) {
    return prisma.breakdownRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: "No readable script text is available for this version. Upload a text-selectable PDF, FDX, TXT, or MD file before running breakdown."
      },
      include: breakdownRunInclude
    });
  }

  try {
    const sceneOutline = buildSceneOutline(sourceText, {
      projectId: run.projectId,
      versionName: `v${version.versionNumber}`,
      fileName: version.fileName
    });
    const selected = await runClaudeSkillBreakdown({
      sourceText,
      title: version.document.title,
      fileName: version.fileName,
      sceneOutline
    });
    const scenes = sceneOutline.length ? mergeClaudeSceneDetailsIntoOutline(sceneOutline, selected.scenes) : selected.scenes;
    const elements = assignElementsToScenes(selected.elements, sceneOutline);
    attachElementsToSceneSummaries(scenes, elements);

    await prisma.$transaction(async (tx) => {
      for (const element of elements) {
        const tags = await Promise.all(element.tagKeys.map((tag) => tx.tag.upsert({
          where: { scope_key_value: { scope: "BREAKDOWN", key: tag.key, value: tag.value } },
          create: { scope: "BREAKDOWN", key: tag.key, value: tag.value, label: tag.label, color: tag.color },
          update: { label: tag.label, color: tag.color }
        })));

        await tx.breakdownElement.create({
          data: {
            runId: run.id,
            projectId: run.projectId,
            documentVersionId: version.id,
            stableKey: element.stableKey,
            category: element.category,
            displayName: element.displayName,
            normalizedName: element.normalizedName,
            description: element.description,
            evidenceText: element.evidenceText,
            sourceText: element.sourceText,
            firstPageNumber: element.firstPageNumber,
            lastPageNumber: element.lastPageNumber,
            pageSource: element.firstPageNumber || element.lastPageNumber ? "ESTIMATED" : "UNKNOWN",
            confidence: element.confidence,
            status: "UNREVIEWED",
            sortOrder: element.sortOrder,
            metadataJson: element.metadataJson,
            tags: { create: tags.map((tag) => ({ tagId: tag.id })) },
            sceneElements: { create: element.scenes.map((scene) => ({ runId: run.id, ...scene })) }
          }
        });
      }

      await tx.breakdownRun.update({
        where: { id: run.id },
        data: {
          status: "READY_FOR_REVIEW",
          parserName: selected.parserName,
          parserVersion: selected.parserVersion,
          warning: selected.warning,
          completedAt: new Date(),
          summaryJson: {
            elementCount: elements.length,
            categories: countBy(elements.map((element) => element.category)),
            scenes,
            aiModel: selected.model
          },
          statsJson: {
            characters: elements.filter((element) => element.category === "CHARACTER").length,
            extras: elements.filter((element) => element.category === "EXTRAS").length,
            locations: elements.filter((element) => element.category === "LOCATION").length,
            props: elements.filter((element) => element.category === "PROP").length,
            vehicles: elements.filter((element) => element.category === "VEHICLE").length,
            wardrobe: elements.filter((element) => element.category === "WARDROBE").length,
            sfx: elements.filter((element) => element.category === "SFX").length,
            animals: elements.filter((element) => element.category === "ANIMAL").length
          }
        }
      });
    }, { timeout: 45_000 });

    return getBreakdownRun(run.id);
  } catch (error) {
    return markBreakdownRunFailed(run.id, error);
  }
}

async function markBreakdownRunFailed(runId: string, error: unknown) {
  return prisma.breakdownRun.update({
    where: { id: runId },
    data: {
      status: "FAILED",
      error: error instanceof Error ? error.message : "Breakdown failed unexpectedly.",
      completedAt: new Date()
    },
    include: breakdownRunInclude
  });
}

export async function listBreakdownRuns(documentVersionId: string) {
  return prisma.breakdownRun.findMany({ where: { documentVersionId }, orderBy: { createdAt: "desc" }, include: breakdownRunInclude });
}

export async function getBreakdownRun(runId: string) {
  return prisma.breakdownRun.findUnique({ where: { id: runId }, include: breakdownRunInclude });
}

export async function updateBreakdownRunStatus(input: { runId: string; status: BreakdownRunStatus; userId?: string }) {
  return prisma.breakdownRun.update({
    where: { id: input.runId },
    data: {
      status: input.status,
      approvedById: input.status === "APPROVED" ? input.userId : undefined,
      approvedAt: input.status === "APPROVED" ? new Date() : undefined
    },
    include: breakdownRunInclude
  });
}

export async function updateBreakdownElementStatus(input: { elementId: string; status: BreakdownElementStatus }) {
  const element = await prisma.breakdownElement.update({ where: { id: input.elementId }, data: { status: input.status }, select: { runId: true } });
  return getBreakdownRun(element.runId);
}

export async function deleteBreakdownRun(input: { runId: string }) {
  await prisma.breakdownRun.delete({ where: { id: input.runId } });
}

function buildSceneOutline(sourceText: string, options: { projectId: string; versionName: string; fileName: string }): BreakdownSceneReference[] {
  try {
    const parsed = parseScriptText(sourceText, options);
    let estimatedPage = 1;
    return parsed.scenes.slice(0, 300).map((scene) => {
      const page = Math.max(1, Math.round(estimatedPage * 10) / 10);
      estimatedPage += Math.max(scene.pageEstimate || 0.25, 0.125);
      return sceneToBreakdownReference(scene, page);
    });
  } catch {
    return [];
  }
}

function sceneToBreakdownReference(scene: ParsedScriptScene, page: number): BreakdownSceneReference {
  return {
    sceneNumber: String(scene.number),
    page,
    intExt: scene.interiorExterior || undefined,
    location: scene.location || undefined,
    timeOfDay: scene.timeOfDay || undefined,
    sceneHeading: scene.slugline || `Scene ${scene.number}`,
    synopsis: summarizeSceneText(scene.actionText || scene.text),
    elementIds: [],
    evidence: scene.slugline,
    text: scene.text
  };
}

function stripSceneReferenceText(scene: BreakdownSceneReference): BreakdownSceneDraft {
  const { text: _text, ...draft } = scene;
  return draft;
}

function mergeClaudeSceneDetailsIntoOutline(sceneOutline: BreakdownSceneReference[], claudeScenes: BreakdownSceneDraft[]) {
  const claudeByNumber = new Map(claudeScenes.filter((scene) => !isUnassignedScene(scene) && scene.sceneNumber).map((scene) => [scene.sceneNumber, scene]));
  const claudeByHeading = new Map(claudeScenes.filter((scene) => !isUnassignedScene(scene) && scene.sceneHeading).map((scene) => [normalizeSearchText(scene.sceneHeading), scene]));
  return sceneOutline.map((outlineScene) => {
    const match = (outlineScene.sceneNumber ? claudeByNumber.get(outlineScene.sceneNumber) : undefined)
      ?? (outlineScene.sceneHeading ? claudeByHeading.get(normalizeSearchText(outlineScene.sceneHeading)) : undefined);
    const base = stripSceneReferenceText(outlineScene);
    if (!match) return base;
    return {
      ...base,
      printedNumber: match.printedNumber || base.printedNumber,
      page: match.page ?? base.page,
      intExt: match.intExt || base.intExt,
      location: match.location || base.location,
      timeOfDay: match.timeOfDay || base.timeOfDay,
      synopsis: match.synopsis || base.synopsis,
      evidence: match.evidence || base.evidence,
      elementIds: Array.from(new Set([...(base.elementIds ?? []), ...(match.elementIds ?? [])]))
    };
  });
}

function isUnassignedScene(scene: Pick<BreakdownSceneDraft, "sceneNumber" | "sceneHeading">) {
  const sceneNumber = (scene.sceneNumber ?? "").trim().toLowerCase();
  const sceneHeading = (scene.sceneHeading ?? "").trim().toLowerCase();
  return (!sceneNumber || sceneNumber === "unassigned" || sceneNumber === "unknown")
    && (!sceneHeading || sceneHeading === "unassigned" || sceneHeading === "unassigned scene" || sceneHeading === "unknown");
}

function assignElementsToScenes(elements: BreakdownElementDraft[], sceneOutline: BreakdownSceneReference[]) {
  if (!sceneOutline.length) return elements;
  return elements.map((element) => {
    const hasAssignedScene = element.scenes.some((scene) => !isUnassignedScene(scene));
    if (hasAssignedScene) return element;
    const matchedScene = findSceneForElement(element, sceneOutline);
    if (!matchedScene) return element;
    return {
      ...element,
      firstPageNumber: element.firstPageNumber ?? scenePageNumber(matchedScene),
      lastPageNumber: element.lastPageNumber ?? scenePageNumber(matchedScene),
      scenes: [{
        sceneNumber: matchedScene.sceneNumber ?? "",
        sceneHeading: matchedScene.sceneHeading ?? "",
        occurrenceCount: 1,
        firstPageNumber: matchedScene.page ? Math.floor(matchedScene.page) : undefined,
        lastPageNumber: matchedScene.page ? Math.floor(matchedScene.page) : undefined,
        evidenceText: element.evidenceText,
        metadataJson: { parser: "claude-production-breakdown-skill", sceneMatchedBy: "script-evidence" }
      }]
    };
  });
}

function scenePageNumber(scene: Pick<BreakdownSceneReference, "page">) {
  return scene.page ? Math.floor(scene.page) : undefined;
}

function findSceneForElement(element: BreakdownElementDraft, sceneOutline: BreakdownSceneReference[]) {
  const needles = [
    element.evidenceText,
    element.sourceText,
    element.displayName,
    element.normalizedName
  ].map(normalizeSearchText).filter((value) => value.length >= 3);

  for (const needle of needles) {
    const compactNeedle = needle.slice(0, 180);
    const matched = sceneOutline.find((scene) => normalizeSearchText(scene.text ?? "").includes(compactNeedle));
    if (matched) return matched;
  }

  return undefined;
}

function attachElementsToSceneSummaries(scenes: BreakdownSceneDraft[], elements: BreakdownElementDraft[]) {
  const scenesByKey = new Map(scenes.map((scene) => [sceneKey(scene.sceneNumber, scene.sceneHeading), scene]));
  for (const element of elements) {
    for (const ref of element.scenes) {
      const scene = scenesByKey.get(sceneKey(ref.sceneNumber, ref.sceneHeading));
      if (!scene) continue;
      if (!scene.elementIds.includes(element.stableKey)) scene.elementIds.push(element.stableKey);
    }
  }
}

function sceneKey(sceneNumber?: string, sceneHeading?: string) {
  return `${(sceneNumber ?? "").trim().toLowerCase()}::${(sceneHeading ?? "").trim().toLowerCase()}`;
}

function summarizeSceneText(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, 220);
}

function normalizeSearchText(value?: string) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

async function runClaudeSkillBreakdown(input: { sourceText: string; title: string; fileName: string; sceneOutline: BreakdownSceneReference[] }): Promise<BreakdownSource> {
  const settings = await readStoredLlmProviderSettings().catch(() => null);
  if (!settings?.enabled) throw new Error("Claude production breakdown is disabled in Admin Settings.");
  if (settings.provider !== "anthropic") throw new Error("Production breakdown requires Claude / Anthropic as the active LLM provider.");
  if (!settings.allowExternalScriptAnalysis) throw new Error("External script analysis must be enabled before running the Claude production breakdown.");
  const apiKey = await resolveLlmApiKey(settings);
  if (!apiKey) throw new Error("No Anthropic API key is configured for Claude production breakdown.");

  const text = input.sourceText.slice(0, settings.maxInputCharacters);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 20000,
      system: "You are running the Production Breakdown skill for GreenLight. Follow the uploaded production-breakdown skill taxonomy and CSV column intent exactly. Use the submit_breakdown tool exactly once.",
      tools: [claudeBreakdownTool()],
      tool_choice: { type: "tool", name: "submit_breakdown" },
      messages: [{ role: "user", content: claudeBreakdownPrompt(input.title, input.fileName, text, input.sceneOutline) }]
    })
  });
  const data = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) throw new Error(anthropicError(data) || `Claude breakdown failed with status ${response.status}.`);
  const payload = extractAnthropicBreakdownPayload(data);
  const elements = normalizeClaudeElements(payload);
  const scenes = normalizeClaudeScenes(payload);
  if (!elements.length) throw new Error("Claude returned no usable production-breakdown elements.");
  return {
    parserName: "claude-production-breakdown-skill",
    parserVersion: settings.model,
    model: settings.model,
    elements,
    scenes,
    warning: input.sourceText.length > settings.maxInputCharacters ? `Claude analyzed the first ${settings.maxInputCharacters.toLocaleString()} characters because of the configured Admin limit.` : undefined
  };
}

function claudeBreakdownPrompt(title: string, fileName: string, text: string, sceneOutline: BreakdownSceneReference[]) {
  const outline = sceneOutline.slice(0, 300).map((scene) => [
    scene.sceneNumber ? `${scene.sceneNumber}.` : "-",
    scene.sceneHeading ?? "Untitled Scene",
    scene.location ? `location: ${scene.location}` : "",
    scene.timeOfDay ? `time: ${scene.timeOfDay}` : "",
    scene.page ? `page: ${scene.page}` : ""
  ].filter(Boolean).join(" | ")).join("\n");
  return `Analyze this script using the Production Breakdown skill and submit the breakdown with the submit_breakdown tool.

Rules:
- Use only the uploaded skill taxonomy categories: char, extras, location, prop, vehicle, wardrobe, sfx, animal.
- Do not create action, vfx, note, other, set dressing, camera, music, sound, makeup, or department-only categories.
- Every element belongs to exactly one category.
- Treat taxonomy/category values as searchable tags, not database IDs.
- Use stable ids in the skill style: char-kora, prop-holocube, location-dock-seven.
- Cite verbatim evidence from the script for every element.
- Prefer useful production items over exhaustive noise.
- Keep names clean and human-readable.
- Keep evidence concise; do not paste long paragraphs.
- Skip generic background nouns unless a department has to source/build/wrangle them.
- For char vs extras: any speaking role is char; non-speaking background performers are extras.
- For animal vs char: speaking or anthropomorphized animals are char; production animals are animal.
- If a scene number or heading is known, include it. Otherwise leave those fields blank.
- Also submit a complete scenes list in screenplay order, matching the production-breakdown skill scenes.csv intent.
- Scene rows should include scene number, printed number if visible, page when known, INT/EXT, location, time of day, a one-line synopsis, and element ids present.
- Use the provided scene outline as the canonical scene list. Match elements to these scene numbers/headings whenever the evidence appears in that scene.
- Match the production-breakdown skill CSV fields as closely as possible:
  - scenes.csv: scene_number, printed_number, page, int_ext, location, time_of_day, page_eighths, synopsis, cast, element_ids.
  - characters.csv: speaking, role, first_scene, last_scene, scene_count, scene_numbers, evidence.
  - locations.csv: int_ext, times_of_day, slugs, scene_count, scene_numbers, page_eighths, sub_locations.
  - props.csv: category, hero, department, continuity_risk, scene_count, scene_numbers, evidence. Use the same fields for vehicle, wardrobe, and sfx rows.
  - animals.csv: species, count, named, action, recommendation, wrangler_required, aha_notes, scene_count, scene_numbers, evidence.
- Populate category-specific fields when the script supports them. Use blank values instead of inventing.
- Judge across the whole script: if a role speaks anywhere, classify it as char everywhere; non-speaking background performers are extras.
- Drop rather than guess. If there is no verbatim evidence, leave the item out.

Title: ${title}
File: ${fileName}

SCENE OUTLINE:
${outline || "No structural scene outline was available."}

SCRIPT:
${text}`;
}

function claudeBreakdownTool() {
  return {
    name: "submit_breakdown",
    description: "Submit a GreenLight production breakdown for a screenplay.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        scenes: {
          type: "array",
          maxItems: 300,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              sceneNumber: { type: "string" },
              printedNumber: { type: "string" },
              page: { type: "number" },
              pageEighths: { type: "number" },
              intExt: { type: "string" },
              location: { type: "string" },
              timeOfDay: { type: "string" },
              sceneHeading: { type: "string" },
              synopsis: { type: "string" },
              cast: {
                type: "array",
                maxItems: 80,
                items: { type: "string" }
              },
              elementIds: {
                type: "array",
                maxItems: 100,
                items: { type: "string" }
              },
              evidence: { type: "string" }
            },
            required: ["sceneNumber", "sceneHeading", "synopsis"]
          }
        },
        elements: {
          type: "array",
          maxItems: 500,
          items: {
              type: "object",
              additionalProperties: false,
              properties: {
              id: { type: "string" },
              category: { type: "string", enum: ["char", "extras", "location", "prop", "vehicle", "wardrobe", "sfx", "animal"] },
              name: { type: "string" },
              description: { type: "string" },
              evidence: { type: "string" },
              sceneNumber: { type: "string" },
              sceneHeading: { type: "string" },
              speaking: { type: "string" },
              role: { type: "string" },
              firstScene: { type: "string" },
              lastScene: { type: "string" },
              sceneCount: { type: "number" },
              sceneNumbers: {
                type: "array",
                maxItems: 300,
                items: { type: "string" }
              },
              intExt: { type: "string" },
              timesOfDay: {
                type: "array",
                maxItems: 20,
                items: { type: "string" }
              },
              slugs: {
                type: "array",
                maxItems: 120,
                items: { type: "string" }
              },
              pageEighths: { type: "number" },
              subLocations: {
                type: "array",
                maxItems: 80,
                items: { type: "string" }
              },
              hero: { type: "string" },
              department: { type: "string" },
              continuityRisk: { type: "string" },
              species: { type: "string" },
              count: { type: "string" },
              named: { type: "string" },
              action: { type: "string" },
              recommendation: { type: "string" },
              wranglerRequired: { type: "string" },
              ahaNotes: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              tags: {
                type: "array",
                maxItems: 12,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    key: { type: "string" },
                    value: { type: "string" },
                    label: { type: "string" }
                  },
                  required: ["key", "value"]
                }
              }
            },
            required: ["category", "name"]
          }
        }
      },
      required: ["scenes", "elements"]
    }
  };
}

function normalizeClaudeElements(payload: unknown): BreakdownElementDraft[] {
  const parsed = typeof payload === "string" ? parseJsonBlock(payload) : payload;
  const parsedRecord = parsed && typeof parsed === "object" ? parsed as { elements?: unknown[] } : {};
  const elements: unknown[] = Array.isArray(parsedRecord.elements) ? parsedRecord.elements : [];
  const rows = elements.slice(0, 500).map((item, index) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const category = normalizeCategory(record.category);
    const displayName = stringValue(record.name) || "Untitled Breakdown Item";
    const normalizedName = normalizeName(displayName);
    const sceneNumber = stringValue(record.sceneNumber);
    const sceneHeading = stringValue(record.sceneHeading);
    const tags = normalizeTags(record.tags, category);
    const submittedId = stringValue(record.id);
    const skillFields = normalizeSkillCsvFields(record);
    return {
      stableKey: submittedId ? slugify(submittedId) : `${skillCategoryPrefix(category)}-${slugify(normalizedName || displayName)}-${index}`,
      category,
      displayName,
      normalizedName: normalizedName || displayName.toLowerCase(),
      description: stringValue(record.description),
      evidenceText: stringValue(record.evidence),
      sourceText: stringValue(record.evidence),
      confidence: clampConfidence(record.confidence),
      sortOrder: index,
      metadataJson: { parser: "claude-production-breakdown-skill", skillCategory: skillCategoryPrefix(category), skillCsvFields: skillFields },
      tagKeys: uniqueTags([...tags, ...skillFieldTags(skillFields)]),
      scenes: [{ sceneNumber, sceneHeading, occurrenceCount: 1, evidenceText: stringValue(record.evidence), metadataJson: { parser: "claude-production-breakdown-skill" } }]
    };
  }).filter((element) => element.displayName.trim());
  return mergeBreakdownElementRows(rows);
}

function normalizeClaudeScenes(payload: unknown): BreakdownSceneDraft[] {
  const parsed = typeof payload === "string" ? parseJsonBlock(payload) : payload;
  const parsedRecord = parsed && typeof parsed === "object" ? parsed as { scenes?: unknown[] } : {};
  const scenes = Array.isArray(parsedRecord.scenes) ? parsedRecord.scenes : [];
  return scenes.slice(0, 300).map((item, index) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const sceneNumber = stringValue(record.sceneNumber) || String(index + 1);
    const sceneHeading = stringValue(record.sceneHeading) || stringValue(record.slugline) || "Unassigned Scene";
    const elementIds = Array.isArray(record.elementIds)
      ? record.elementIds.map(stringValue).filter(Boolean).slice(0, 100)
      : [];
    return {
      sceneNumber,
      printedNumber: stringValue(record.printedNumber) || undefined,
      page: numberValue(record.page),
      pageEighths: numberValue(record.pageEighths) ?? numberValue(record.page_eighths),
      intExt: stringValue(record.intExt) || stringValue(record.int_ext) || undefined,
      location: stringValue(record.location) || undefined,
      timeOfDay: stringValue(record.timeOfDay) || stringValue(record.time_of_day) || undefined,
      sceneHeading,
      synopsis: stringValue(record.synopsis) || undefined,
      cast: arrayStringValue(record.cast).slice(0, 80),
      elementIds,
      evidence: stringValue(record.evidence) || undefined
    };
  }).filter((scene) => scene.sceneNumber || scene.sceneHeading);
}

function normalizeSkillCsvFields(record: Record<string, unknown>): Prisma.InputJsonObject {
  const fields: Record<string, Prisma.InputJsonValue> = {};
  const stringFields = [
    "speaking",
    "role",
    "firstScene",
    "lastScene",
    "intExt",
    "hero",
    "department",
    "continuityRisk",
    "species",
    "count",
    "named",
    "action",
    "recommendation",
    "wranglerRequired",
    "ahaNotes"
  ];
  for (const key of stringFields) {
    const value = stringValue(record[key]);
    if (value) fields[key] = value;
  }
  const sceneNumbers = arrayStringValue(record.sceneNumbers);
  if (sceneNumbers.length) fields.sceneNumbers = sceneNumbers;
  const timesOfDay = arrayStringValue(record.timesOfDay);
  if (timesOfDay.length) fields.timesOfDay = timesOfDay;
  const slugs = arrayStringValue(record.slugs);
  if (slugs.length) fields.slugs = slugs;
  const subLocations = arrayStringValue(record.subLocations);
  if (subLocations.length) fields.subLocations = subLocations;
  const sceneCount = numberValue(record.sceneCount);
  if (sceneCount !== undefined) fields.sceneCount = sceneCount;
  const pageEighths = numberValue(record.pageEighths);
  if (pageEighths !== undefined) fields.pageEighths = pageEighths;
  return fields as Prisma.InputJsonObject;
}

function skillFieldTags(fields: Prisma.InputJsonObject) {
  const tags: Array<{ key: string; value: string; label?: string; color?: string }> = [];
  for (const key of ["speaking", "role", "hero", "department", "continuityRisk", "species", "recommendation", "wranglerRequired"]) {
    const value = fields[key];
    if (typeof value === "string" && value.trim()) tags.push({ key: key.toLowerCase(), value: slugify(value), label: value });
  }
  return tags;
}

function mergeBreakdownElementRows(rows: BreakdownElementDraft[]) {
  const byStableKey = new Map<string, BreakdownElementDraft>();
  for (const row of rows) {
    const existing = byStableKey.get(row.stableKey);
    if (!existing) {
      byStableKey.set(row.stableKey, row);
      continue;
    }
    existing.description = existing.description || row.description;
    existing.evidenceText = existing.evidenceText || row.evidenceText;
    existing.sourceText = existing.sourceText || row.sourceText;
    existing.firstPageNumber = minDefined(existing.firstPageNumber, row.firstPageNumber);
    existing.lastPageNumber = maxDefined(existing.lastPageNumber, row.lastPageNumber);
    existing.confidence = maxDefined(existing.confidence, row.confidence);
    existing.tagKeys = uniqueTags([...existing.tagKeys, ...row.tagKeys]);
    for (const scene of row.scenes) {
      const sceneKey = `${scene.sceneNumber ?? ""}:${scene.sceneHeading ?? ""}`;
      const existingScene = existing.scenes.find((item) => `${item.sceneNumber ?? ""}:${item.sceneHeading ?? ""}` === sceneKey);
      if (existingScene) {
        existingScene.occurrenceCount += scene.occurrenceCount;
        existingScene.evidenceText = existingScene.evidenceText || scene.evidenceText;
      } else {
        existing.scenes.push(scene);
      }
    }
  }
  return Array.from(byStableKey.values()).map((element, index) => ({ ...element, sortOrder: index }));
}

function normalizeTags(value: unknown, category: BreakdownTaxonomyCategory) {
  const submitted = Array.isArray(value) ? value : [];
  const tags = submitted.map((item) => item && typeof item === "object" ? item as Record<string, unknown> : null)
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({ key: stringValue(item.key).toLowerCase() || "tag", value: stringValue(item.value).toLowerCase() || "unknown", label: stringValue(item.label) || undefined }))
    .filter((tag) => tag.value !== "unknown");
  return uniqueTags([
    { key: "taxonomy", value: skillCategoryPrefix(category), label: taxonomyLabel(category) },
    { key: "department", value: categoryDepartments[category], label: departmentLabel(categoryDepartments[category]) },
    ...tags
  ]);
}

function uniqueTags(tags: Array<{ key: string; value: string; label?: string; color?: string }>) {
  const seen = new Set<string>();
  return tags.filter((tag) => {
    const key = `${tag.key}:${tag.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseJsonBlock(text: string) {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed) as { elements?: unknown[] };
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as { elements?: unknown[] };
      } catch {
        return salvageBreakdownJson(match[0]);
      }
    }
    return salvageBreakdownJson(trimmed);
  }
}

function extractAnthropicBreakdownPayload(data: Record<string, unknown> | null) {
  const content = Array.isArray(data?.content) ? data.content : [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const record = block as Record<string, unknown>;
    if (record.type === "tool_use" && record.name === "submit_breakdown" && record.input && typeof record.input === "object") {
      return record.input;
    }
  }
  return content.map((block) => block && typeof block === "object" && typeof (block as Record<string, unknown>).text === "string" ? (block as Record<string, unknown>).text : "").join("\n").trim();
}

function salvageBreakdownJson(text: string) {
  const elementObjects = extractObjectLiteralsFromElementsArray(text);
  if (!elementObjects.length) return null;
  const elements = elementObjects
    .map((objectText) => {
      try {
        return JSON.parse(objectText) as unknown;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return elements.length ? { elements } : null;
}

function extractObjectLiteralsFromElementsArray(text: string) {
  const elementsIndex = text.search(/"elements"\s*:/);
  if (elementsIndex < 0) return [];
  const arrayStart = text.indexOf("[", elementsIndex);
  if (arrayStart < 0) return [];
  const objects: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let index = arrayStart + 1; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = inString;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        objects.push(text.slice(start, index + 1));
        start = -1;
      }
      continue;
    }
    if (char === "]" && depth === 0) break;
  }
  return objects;
}

function anthropicError(data: Record<string, unknown> | null) {
  const error = data?.error;
  return error && typeof error === "object" && typeof (error as Record<string, unknown>).message === "string" ? (error as Record<string, unknown>).message as string : "";
}

function normalizeCategory(value: unknown): BreakdownTaxonomyCategory {
  const category = stringValue(value).toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const allowed: Record<string, BreakdownTaxonomyCategory> = {
    char: "CHARACTER",
    character: "CHARACTER",
    characters: "CHARACTER",
    extras: "EXTRAS",
    background: "EXTRAS",
    background_cast: "EXTRAS",
    location: "LOCATION",
    locations: "LOCATION",
    prop: "PROP",
    props: "PROP",
    vehicle: "VEHICLE",
    vehicles: "VEHICLE",
    wardrobe: "WARDROBE",
    costume: "WARDROBE",
    costumes: "WARDROBE",
    sfx: "SFX",
    special_effects: "SFX",
    animal: "ANIMAL",
    animals: "ANIMAL"
  };
  const normalized = allowed[category];
  if (normalized) return normalized;
  throw new Error(`Claude returned unsupported production-breakdown category "${stringValue(value) || "blank"}". Allowed categories: char, extras, location, prop, vehicle, wardrobe, sfx, animal.`);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 1200) : "";
}

function arrayStringValue(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(stringValue).filter(Boolean);
}

function clampConfidence(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.max(0, Math.min(1, number));
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function minDefined(left?: number, right?: number) {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return Math.min(left, right);
}

function maxDefined(left?: number, right?: number) {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return Math.max(left, right);
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 96);
}

function skillCategoryPrefix(category: BreakdownTaxonomyCategory) {
  if (category === "CHARACTER") return "char";
  return category.toLowerCase();
}

function taxonomyLabel(category: BreakdownTaxonomyCategory) {
  return category.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function departmentLabel(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}

export function normalizeClaudeBreakdownElementsForTest(payload: unknown) {
  return normalizeClaudeElements(payload).map((element) => ({
    category: element.category,
    displayName: element.displayName,
    sceneNumber: element.scenes[0]?.sceneNumber
  }));
}

export function normalizeClaudeBreakdownScenesForTest(payload: unknown) {
  return normalizeClaudeScenes(payload);
}
