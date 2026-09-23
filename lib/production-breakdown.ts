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

type BreakdownSource = {
  parserName: string;
  parserVersion: string;
  elements: BreakdownElementDraft[];
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
      parserName: "greenlight-production-breakdown",
      parserVersion: "deterministic-v1",
      createdById: input.userId
    }
  });

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
    const parsed = parseScriptText(sourceText, {
      projectId: version.document.projectId,
      versionName: `v${version.versionNumber}`,
      fileName: version.fileName
    });
    const deterministic = {
      parserName: "greenlight-production-breakdown",
      parserVersion: "deterministic-v1",
      elements: materializeDeterministicElements(parsed.scenes)
    };
    const selected = await maybeRunClaudeBreakdown({
      sourceText,
      title: version.document.title,
      fileName: version.fileName,
      deterministic
    });

    await prisma.$transaction(async (tx) => {
      for (const element of selected.elements) {
        const tags = await Promise.all(element.tagKeys.map((tag) => tx.tag.upsert({
          where: { scope_key_value: { scope: "BREAKDOWN", key: tag.key, value: tag.value } },
          create: { scope: "BREAKDOWN", key: tag.key, value: tag.value, label: tag.label, color: tag.color },
          update: { label: tag.label, color: tag.color }
        })));

        await tx.breakdownElement.create({
          data: {
            runId: run.id,
            projectId: version.document.projectId!,
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
            elementCount: selected.elements.length,
            categories: countBy(selected.elements.map((element) => element.category)),
            aiModel: selected.model
          },
          statsJson: {
            characters: selected.elements.filter((element) => element.category === "CHARACTER").length,
            locations: selected.elements.filter((element) => element.category === "LOCATION").length,
            props: selected.elements.filter((element) => element.category === "PROP").length,
            action: selected.elements.filter((element) => element.category === "ACTION").length,
            vfx: selected.elements.filter((element) => element.category === "VFX").length
          }
        }
      });
    }, { timeout: 45_000 });

    return getBreakdownRun(run.id);
  } catch (error) {
    return prisma.breakdownRun.update({
      where: { id: run.id },
      data: { status: "FAILED", error: error instanceof Error ? error.message : "Breakdown failed unexpectedly." },
      include: breakdownRunInclude
    });
  }
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

async function maybeRunClaudeBreakdown(input: { sourceText: string; title: string; fileName: string; deterministic: BreakdownSource }): Promise<BreakdownSource> {
  const settings = await readStoredLlmProviderSettings().catch(() => null);
  if (!settings?.enabled || settings.provider !== "anthropic" || !settings.allowExternalScriptAnalysis) return input.deterministic;
  const apiKey = await resolveLlmApiKey(settings);
  if (!apiKey) return { ...input.deterministic, warning: "Claude breakdown skipped because no Anthropic API key is configured." };

  try {
    const text = input.sourceText.slice(0, settings.maxInputCharacters);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 6000,
        system: "You are GreenLight's film production breakdown assistant. Return strict JSON only. Extract production breakdown items from screenplay text for studio review.",
        messages: [{ role: "user", content: claudeBreakdownPrompt(input.title, input.fileName, text) }]
      })
    });
    const data = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok) throw new Error(anthropicError(data) || `Claude breakdown failed with status ${response.status}.`);
    const elements = normalizeClaudeElements(extractAnthropicText(data));
    if (!elements.length) throw new Error("Claude returned no usable breakdown elements.");
    return {
      parserName: "anthropic-claude-production-breakdown",
      parserVersion: settings.model,
      model: settings.model,
      elements,
      warning: input.sourceText.length > settings.maxInputCharacters ? `Claude analyzed the first ${settings.maxInputCharacters.toLocaleString()} characters because of the configured Admin limit.` : undefined
    };
  } catch (error) {
    return {
      ...input.deterministic,
      warning: `Claude breakdown skipped; deterministic breakdown was saved instead. ${error instanceof Error ? error.message : "Unknown Claude error."}`
    };
  }
}

function claudeBreakdownPrompt(title: string, fileName: string, text: string) {
  return `Analyze this script and return JSON with this shape only:
{"elements":[{"category":"CHARACTER|EXTRAS|LOCATION|PROP|VEHICLE|WARDROBE|SFX|ANIMAL|ACTION|VFX|NOTE|OTHER","name":"item name","description":"short production note","evidence":"source text","sceneNumber":"1","sceneHeading":"INT. LOCATION - DAY","confidence":0.0,"tags":[{"key":"taxonomy","value":"character"},{"key":"department","value":"cast"}]}]}

Rules:
- Use category labels exactly from the allowed list.
- Treat taxonomy/category values as searchable tags, not IDs.
- Include characters, locations, props, vehicles, wardrobe, SFX, animals, action/stunts, VFX, and important production notes.
- Prefer useful production items over exhaustive noise.
- Keep names clean and human-readable.

Title: ${title}
File: ${fileName}

SCRIPT:
${text}`;
}

function normalizeClaudeElements(rawText: string): BreakdownElementDraft[] {
  const parsed = parseJsonBlock(rawText);
  const elements = Array.isArray(parsed?.elements) ? parsed.elements : [];
  return elements.slice(0, 500).map((item, index) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const category = normalizeCategory(record.category);
    const displayName = stringValue(record.name) || "Untitled Breakdown Item";
    const normalizedName = normalizeName(displayName);
    const sceneNumber = stringValue(record.sceneNumber) || "Unassigned";
    const sceneHeading = stringValue(record.sceneHeading) || "Unassigned Scene";
    const tags = normalizeTags(record.tags, category);
    return {
      stableKey: `${category.toLowerCase()}:${slugify(normalizedName || displayName)}:${index}`,
      category,
      displayName,
      normalizedName: normalizedName || displayName.toLowerCase(),
      description: stringValue(record.description),
      evidenceText: stringValue(record.evidence),
      sourceText: stringValue(record.evidence),
      confidence: clampConfidence(record.confidence),
      sortOrder: index,
      metadataJson: { parser: "claude" },
      tagKeys: tags,
      scenes: [{ sceneNumber, sceneHeading, occurrenceCount: 1, evidenceText: stringValue(record.evidence), metadataJson: { parser: "claude" } }]
    };
  }).filter((element) => element.displayName.trim());
}

function materializeDeterministicElements(scenes: ParsedScriptScene[]) {
  const byStableKey = new Map<string, BreakdownElementDraft>();
  let sortOrder = 0;
  for (const scene of scenes) {
    for (const name of scene.characters) addElement(byStableKey, { category: "CHARACTER", name, scene, description: "Detected from dialogue cues or character descriptions.", evidence: findEvidence(scene.text, name), confidence: 0.82, sortOrder: sortOrder++ });
    for (const name of scene.environments) addElement(byStableKey, { category: "LOCATION", name, scene, description: "Detected from scene heading or environment hint.", evidence: scene.slugline, confidence: 0.86, sortOrder: sortOrder++ });
    for (const name of scene.props) addElement(byStableKey, { category: "PROP", name, scene, description: "Detected from prop keyword matching.", evidence: findEvidence(scene.actionText, name), confidence: 0.7, sortOrder: sortOrder++ });
    for (const beat of scene.stuntBeats) addElement(byStableKey, { category: "ACTION", name: summarizeBeat(beat), scene, description: "Detected action or stunt moment.", evidence: beat, confidence: 0.64, sortOrder: sortOrder++ });
    for (const beat of scene.vfxBeats) addElement(byStableKey, { category: "VFX", name: summarizeBeat(beat), scene, description: "Detected VFX or technical moment.", evidence: beat, confidence: 0.62, sortOrder: sortOrder++ });
  }
  return Array.from(byStableKey.values());
}

function addElement(byStableKey: Map<string, BreakdownElementDraft>, input: { category: BreakdownTaxonomyCategory; name: string; scene: ParsedScriptScene; description: string; evidence?: string; confidence: number; sortOrder: number }) {
  const displayName = input.name.replace(/\s+/g, " ").trim();
  const normalizedName = normalizeName(displayName);
  if (!normalizedName) return;
  const stableKey = `${input.category.toLowerCase()}:${slugify(normalizedName)}`;
  const pageStart = Math.max(1, Math.round(((input.scene.number - 1) * 0.75 + 1) * 10) / 10);
  const pageEnd = Math.max(pageStart, Math.round((pageStart + input.scene.pageEstimate) * 10) / 10);
  const sceneReference = { sceneNumber: String(input.scene.number), sceneHeading: input.scene.slugline, occurrenceCount: 1, firstPageNumber: pageStart, lastPageNumber: pageEnd, evidenceText: input.evidence, metadataJson: { parsedSceneId: input.scene.id, riskLevel: input.scene.riskLevel } };
  const existing = byStableKey.get(stableKey);
  if (existing) {
    existing.lastPageNumber = Math.max(existing.lastPageNumber ?? pageEnd, pageEnd);
    existing.confidence = Math.max(existing.confidence ?? 0, input.confidence);
    existing.scenes.push(sceneReference);
    return;
  }
  byStableKey.set(stableKey, {
    stableKey,
    category: input.category,
    displayName,
    normalizedName,
    description: input.description,
    evidenceText: input.evidence,
    sourceText: input.scene.text,
    firstPageNumber: pageStart,
    lastPageNumber: pageEnd,
    confidence: input.confidence,
    sortOrder: input.sortOrder,
    metadataJson: { parser: "deterministic" },
    tagKeys: normalizeTags(undefined, input.category),
    scenes: [sceneReference]
  });
}

function normalizeTags(value: unknown, category: BreakdownTaxonomyCategory) {
  const submitted = Array.isArray(value) ? value : [];
  const tags = submitted.map((item) => item && typeof item === "object" ? item as Record<string, unknown> : null)
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({ key: stringValue(item.key).toLowerCase() || "tag", value: stringValue(item.value).toLowerCase() || "unknown", label: stringValue(item.label) || undefined }))
    .filter((tag) => tag.value !== "unknown");
  return uniqueTags([
    { key: "taxonomy", value: category.toLowerCase(), label: taxonomyLabel(category) },
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
    return match ? JSON.parse(match[0]) as { elements?: unknown[] } : null;
  }
}

function extractAnthropicText(data: Record<string, unknown> | null) {
  const content = Array.isArray(data?.content) ? data.content : [];
  return content.map((block) => block && typeof block === "object" && typeof (block as Record<string, unknown>).text === "string" ? (block as Record<string, unknown>).text : "").join("\n").trim();
}

function anthropicError(data: Record<string, unknown> | null) {
  const error = data?.error;
  return error && typeof error === "object" && typeof (error as Record<string, unknown>).message === "string" ? (error as Record<string, unknown>).message as string : "";
}

function normalizeCategory(value: unknown): BreakdownTaxonomyCategory {
  const category = stringValue(value).toUpperCase().replace(/[^A-Z]+/g, "_");
  const allowed = ["CHARACTER", "EXTRAS", "LOCATION", "PROP", "VEHICLE", "WARDROBE", "SFX", "ANIMAL", "ACTION", "VFX", "NOTE", "OTHER"];
  return allowed.includes(category) ? category as BreakdownTaxonomyCategory : "OTHER";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 1200) : "";
}

function clampConfidence(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.max(0, Math.min(1, number));
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 96);
}

function findEvidence(text: string, name: string) {
  const needle = name.toLowerCase();
  return text.split(/[.\n]/).map((line) => line.trim()).find((line) => line.toLowerCase().includes(needle))?.slice(0, 500);
}

function summarizeBeat(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length <= 80 ? trimmed : `${trimmed.slice(0, 77).trim()}...`;
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
