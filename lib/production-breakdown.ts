import type { BreakdownElementStatus, BreakdownRunStatus, BreakdownTaxonomyCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseScriptText } from "@/lib/script-parser";
import type { ParsedScriptScene } from "@/lib/types";

export type ProductionBreakdownRunRecord = Prisma.BreakdownRunGetPayload<{
  include: {
    createdBy: { select: { id: true; name: true; email: true } };
    approvedBy: { select: { id: true; name: true; email: true } };
    elements: {
      include: {
        tags: { include: { tag: true } };
        sceneElements: true;
      };
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { displayName: "asc" }];
    };
  };
}>;

type MaterializedElement = {
  stableKey: string;
  category: BreakdownTaxonomyCategory;
  displayName: string;
  normalizedName: string;
  description?: string;
  evidenceText?: string;
  sourceText?: string;
  firstPageNumber?: number;
  lastPageNumber?: number;
  confidence: number;
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

export async function runProductionBreakdown(input: {
  documentVersionId: string;
  userId?: string;
}) {
  const version = await prisma.documentVersion.findUnique({
    where: { id: input.documentVersionId },
    include: { document: true }
  });
  if (!version || version.document.deletedAt) {
    throw new Error("Script version not found.");
  }
  if (!version.document.projectId) {
    throw new Error("Breakdowns can only run on scripts attached to a Development Slate project.");
  }

  const run = await prisma.breakdownRun.create({
    data: {
      projectId: version.document.projectId,
      documentId: version.documentId,
      documentVersionId: version.id,
      status: "RUNNING",
      parserVersion: "phase-2-deterministic-v1",
      createdById: input.userId
    }
  });

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
    const parsed = parseScriptText(sourceText, {
      projectId: version.document.projectId,
      versionName: `v${version.versionNumber}`,
      fileName: version.fileName
    });
    const elements = materializeBreakdownElements(parsed.scenes);

    await prisma.$transaction(async (tx) => {
      for (const element of elements) {
        const tags = await Promise.all(element.tagKeys.map((tag) => tx.tag.upsert({
          where: { scope_key_value: { scope: "BREAKDOWN", key: tag.key, value: tag.value } },
          create: {
            scope: "BREAKDOWN",
            key: tag.key,
            value: tag.value,
            label: tag.label,
            color: tag.color
          },
          update: {
            label: tag.label,
            color: tag.color
          }
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
            sceneElements: {
              create: element.scenes.map((scene) => ({
                runId: run.id,
                sceneNumber: scene.sceneNumber,
                sceneHeading: scene.sceneHeading,
                occurrenceCount: scene.occurrenceCount,
                firstPageNumber: scene.firstPageNumber,
                lastPageNumber: scene.lastPageNumber,
                evidenceText: scene.evidenceText,
                notes: scene.notes,
                metadataJson: scene.metadataJson
              }))
            }
          }
        });
      }

      await tx.breakdownRun.update({
        where: { id: run.id },
        data: {
          status: "READY_FOR_REVIEW",
          completedAt: new Date(),
          summaryJson: {
            sceneCount: parsed.scenes.length,
            elementCount: elements.length,
            categories: countBy(elements.map((element) => element.category))
          },
          statsJson: {
            characters: elements.filter((element) => element.category === "CHARACTER").length,
            locations: elements.filter((element) => element.category === "LOCATION").length,
            props: elements.filter((element) => element.category === "PROP").length,
            action: elements.filter((element) => element.category === "ACTION").length,
            vfx: elements.filter((element) => element.category === "VFX").length
          }
        }
      });
    }, { timeout: 30_000 });

    return getBreakdownRun(run.id);
  } catch (error) {
    return prisma.breakdownRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Breakdown failed unexpectedly."
      },
      include: breakdownRunInclude
    });
  }
}

export async function listBreakdownRuns(documentVersionId: string) {
  return prisma.breakdownRun.findMany({
    where: { documentVersionId },
    orderBy: { createdAt: "desc" },
    include: breakdownRunInclude
  });
}

export async function getBreakdownRun(runId: string) {
  return prisma.breakdownRun.findUnique({
    where: { id: runId },
    include: breakdownRunInclude
  });
}

export async function updateBreakdownRunStatus(input: {
  runId: string;
  status: BreakdownRunStatus;
  userId?: string;
}) {
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

export async function updateBreakdownElementStatus(input: {
  elementId: string;
  status: BreakdownElementStatus;
}) {
  const element = await prisma.breakdownElement.update({
    where: { id: input.elementId },
    data: { status: input.status },
    select: { runId: true }
  });
  return getBreakdownRun(element.runId);
}

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

function materializeBreakdownElements(scenes: ParsedScriptScene[]) {
  const byStableKey = new Map<string, MaterializedElement>();
  let sortOrder = 0;

  for (const scene of scenes) {
    for (const name of scene.characters) {
      addElement(byStableKey, {
        category: "CHARACTER",
        name,
        scene,
        description: "Detected from dialogue cues or character descriptions.",
        evidence: findEvidence(scene.text, name),
        confidence: 0.82,
        sortOrder: sortOrder++
      });
    }
    for (const name of scene.environments) {
      addElement(byStableKey, {
        category: "LOCATION",
        name,
        scene,
        description: name.toUpperCase() === scene.location.toUpperCase() ? "Detected from scene heading." : "Detected from location or environment hint.",
        evidence: scene.slugline,
        confidence: name.toUpperCase() === scene.location.toUpperCase() ? 0.92 : 0.68,
        sortOrder: sortOrder++
      });
    }
    for (const name of scene.props) {
      addElement(byStableKey, {
        category: "PROP",
        name,
        scene,
        description: "Detected from prop keyword matching.",
        evidence: findEvidence(scene.actionText, name),
        confidence: 0.7,
        sortOrder: sortOrder++
      });
    }
    for (const beat of scene.stuntBeats) {
      addElement(byStableKey, {
        category: "ACTION",
        name: summarizeBeat(beat),
        scene,
        description: "Detected action or stunt moment.",
        evidence: beat,
        confidence: 0.64,
        sortOrder: sortOrder++
      });
    }
    for (const beat of scene.vfxBeats) {
      addElement(byStableKey, {
        category: "VFX",
        name: summarizeBeat(beat),
        scene,
        description: "Detected visual effects or technical moment.",
        evidence: beat,
        confidence: 0.62,
        sortOrder: sortOrder++
      });
    }
  }

  return Array.from(byStableKey.values());
}

function addElement(byStableKey: Map<string, MaterializedElement>, input: {
  category: BreakdownTaxonomyCategory;
  name: string;
  scene: ParsedScriptScene;
  description: string;
  evidence?: string;
  confidence: number;
  sortOrder: number;
}) {
  const displayName = tidyName(input.name);
  const normalizedName = normalizeName(displayName);
  if (!normalizedName) return;
  const stableKey = `${input.category.toLowerCase()}:${slugify(normalizedName)}`;
  const pageStart = estimateSceneStartPage(input.scene);
  const pageEnd = Math.max(pageStart, Math.round((pageStart + input.scene.pageEstimate) * 10) / 10);
  const existing = byStableKey.get(stableKey);
  const sceneReference = {
    sceneNumber: String(input.scene.number),
    sceneHeading: input.scene.slugline,
    occurrenceCount: 1,
    firstPageNumber: pageStart,
    lastPageNumber: pageEnd,
    evidenceText: input.evidence,
    metadataJson: {
      parsedSceneId: input.scene.id,
      interiorExterior: input.scene.interiorExterior,
      timeOfDay: input.scene.timeOfDay,
      riskLevel: input.scene.riskLevel
    } satisfies Prisma.InputJsonObject
  };

  if (existing) {
    existing.confidence = Math.max(existing.confidence, input.confidence);
    existing.lastPageNumber = Math.max(existing.lastPageNumber ?? pageEnd, pageEnd);
    if (input.evidence && !existing.evidenceText?.includes(input.evidence)) {
      existing.evidenceText = [existing.evidenceText, input.evidence].filter(Boolean).join("\n\n");
    }
    const existingScene = existing.scenes.find((scene) => scene.sceneNumber === sceneReference.sceneNumber);
    if (existingScene) {
      existingScene.occurrenceCount += 1;
    } else {
      existing.scenes.push(sceneReference);
    }
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
    metadataJson: {
      parser: "deterministic",
      sceneCount: 1
    },
    tagKeys: [
      { key: "taxonomy", value: input.category.toLowerCase(), label: taxonomyLabel(input.category) },
      { key: "department", value: categoryDepartments[input.category], label: departmentLabel(categoryDepartments[input.category]) }
    ],
    scenes: [sceneReference]
  });
}

function estimateSceneStartPage(scene: ParsedScriptScene) {
  return Math.max(1, Math.round(((scene.number - 1) * 0.75 + 1) * 10) / 10);
}

function findEvidence(text: string, name: string) {
  const normalizedNeedle = name.toLowerCase();
  return text
    .split(/[.\n]/)
    .map((line) => line.trim())
    .find((line) => line.toLowerCase().includes(normalizedNeedle))
    ?.slice(0, 500);
}

function summarizeBeat(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= 80) return trimmed;
  return `${trimmed.slice(0, 77).trim()}...`;
}

function tidyName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 96);
}

function taxonomyLabel(category: BreakdownTaxonomyCategory) {
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function departmentLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}
