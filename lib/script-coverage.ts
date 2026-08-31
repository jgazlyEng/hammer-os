import { parseScriptText } from "@/lib/script-parser";

export type ScriptCoverageSummary = {
  logline: string;
  synopsis: string;
  genreTone: string;
  mainCharacters: string[];
  comps: string[];
  strengths: string[];
  concerns: string[];
  suggestedNextStep: string;
  scoreDraft: {
    concept: number;
    character: number;
    structure: number;
    dialogue: number;
    originality: number;
    marketability: number;
    budgetFeasibility: number;
    packagingPotential: number;
    overall: number;
  };
};

export type GeneratedScriptCoverage = {
  summary: ScriptCoverageSummary;
  provider: "local";
  model: string;
  warning?: string;
};

export function generateLocalScriptCoverage(input: {
  title: string;
  writerName?: string | null;
  source?: string | null;
  fileName: string;
  versionNumber: number;
  extractedText?: string | null;
}): GeneratedScriptCoverage {
  const text = (input.extractedText ?? "").trim();
  if (!text) {
    return {
      summary: fallbackSummary(input, ""),
      provider: "local",
      model: "greenlight-local-coverage-v1",
      warning: "No readable script text is available yet, so GreenLight created a placeholder coverage draft."
    };
  }

  return {
    summary: fallbackSummary(input, text),
    provider: "local",
    model: "greenlight-local-coverage-v1",
    warning: "This is a local draft from extracted text. External LLM analysis is disabled until explicitly approved for confidential scripts."
  };
}

export function fallbackSummary(input: { title: string; writerName?: string | null; source?: string | null; fileName: string; versionNumber: number }, text: string): ScriptCoverageSummary {
  const parsed = text ? parseScriptText(text, { projectId: "coverage", versionName: `v${input.versionNumber}`, fileName: input.fileName }) : null;
  const cleanLines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const firstAction = cleanLines.find((line) => !/^(INT\.|EXT\.|INT\/EXT\.)/i.test(line) && !/^[A-Z0-9 .'\-()]+$/.test(line)) ?? "";
  const sceneCount = parsed?.scenes.length ?? 0;
  const characters = parsed?.characters.slice(0, 8) ?? [];
  const locations = parsed?.environments.slice(0, 6) ?? [];
  const props = parsed?.props.slice(0, 6) ?? [];
  const actionMoments = (parsed?.stuntBeats.length ?? 0) + (parsed?.vfxBeats.length ?? 0);
  const complexity = Math.min(10, Math.max(3, Math.round((sceneCount / 12) + (locations.length / 2) + (props.length / 3) + (actionMoments / 4))));
  const budgetFeasibility = Math.max(3, 11 - complexity);
  return normalizeSummary({
    logline: firstAction || `${input.title} needs a readable text pass before GreenLight can draft a reliable logline.`,
    synopsis: sceneCount ? `Detected ${sceneCount} scene${sceneCount === 1 ? "" : "s"} across ${locations.length || "multiple"} likely location${locations.length === 1 ? "" : "s"}. Review this draft before treating it as formal coverage.` : "No readable scene structure was available. Upload a text-based script or run OCR before formal coverage.",
    genreTone: input.source ? `Source-driven read from ${input.source}` : "TBD from development read",
    mainCharacters: characters,
    comps: [],
    strengths: sceneCount ? ["Readable scene structure is available for a first-pass development review."] : ["The file is stored and can be reviewed manually."],
    concerns: text ? ["This local draft is based on deterministic parsing and should be reviewed by a producer or executive."] : ["No readable text was available for coverage analysis."],
    suggestedNextStep: text ? "Complete a human read, add a rating, and run external AI coverage only after approval for confidential material." : "Run OCR or upload a text-based version before scoring.",
    scoreDraft: {
      concept: 5,
      character: characters.length ? 6 : 4,
      structure: sceneCount ? 6 : 3,
      dialogue: 5,
      originality: 5,
      marketability: 5,
      budgetFeasibility,
      packagingPotential: 5,
      overall: sceneCount ? 5.5 : 3
    }
  });
}

export function normalizeSummary(value: unknown): ScriptCoverageSummary {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const scoreDraft = record.scoreDraft && typeof record.scoreDraft === "object" ? record.scoreDraft as Record<string, unknown> : {};
  return {
    logline: stringValue(record.logline, "No logline generated."),
    synopsis: stringValue(record.synopsis, "No synopsis generated."),
    genreTone: stringValue(record.genreTone, "Not specified."),
    mainCharacters: stringArray(record.mainCharacters),
    comps: stringArray(record.comps),
    strengths: stringArray(record.strengths),
    concerns: stringArray(record.concerns),
    suggestedNextStep: stringValue(record.suggestedNextStep, "Add human coverage notes."),
    scoreDraft: {
      concept: scoreValue(scoreDraft.concept),
      character: scoreValue(scoreDraft.character),
      structure: scoreValue(scoreDraft.structure),
      dialogue: scoreValue(scoreDraft.dialogue),
      originality: scoreValue(scoreDraft.originality),
      marketability: scoreValue(scoreDraft.marketability),
      budgetFeasibility: scoreValue(scoreDraft.budgetFeasibility),
      packagingPotential: scoreValue(scoreDraft.packagingPotential),
      overall: scoreValue(scoreDraft.overall)
    }
  };
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 12) : [];
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 3000) : fallback;
}

function scoreValue(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return 5;
  return Math.max(1, Math.min(10, Math.round(number * 10) / 10));
}
