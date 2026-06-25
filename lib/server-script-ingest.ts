import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildScriptDiff, parseFdxText, parseScriptText } from "@/lib/script-parser";
import { storeUpload } from "@/lib/server-file-storage";
import type { ParsedScriptVersion, RiskLevel, ScriptProductionDiff } from "@/lib/types";

export interface IngestScriptInput {
  projectId: string;
  versionName: string;
  uploadedBy?: string;
  file: File;
}

export class OcrRequiredError extends Error {
  constructor(message = "No selectable text found in PDF. Scanned PDFs need OCR before parsing.") {
    super(message);
    this.name = "OcrRequiredError";
  }
}

export async function ingestScriptVersion(input: IngestScriptInput) {
  const bytes = Buffer.from(await input.file.arrayBuffer());
  const fileName = input.file.name || "script.txt";
  const mimeType = input.file.type || "application/octet-stream";
  const storedUpload = await storeUpload(input.projectId, fileName, bytes);
  let text: string;

  try {
    text = await extractUploadText(fileName, mimeType, bytes);
  } catch (error) {
    if (error instanceof OcrRequiredError) {
      return recordOcrRequiredUpload(input, {
        fileName,
        mimeType,
        storedUpload,
        message: error.message
      });
    }
    throw error;
  }

  const parsed = parseUploadedScript(text, {
    projectId: input.projectId,
    versionName: input.versionName,
    fileName
  });

  const previousVersion = await prisma.scriptVersion.findFirst({
    where: { projectId: input.projectId },
    orderBy: { uploadedAt: "desc" },
    include: { parsedScenes: { include: { characters: { include: { character: true } }, environments: { include: { environment: true } }, props: { include: { prop: true } } } } }
  });

  const created = await prisma.$transaction(async (tx) => {
    const scriptVersion = await tx.scriptVersion.create({
      data: {
        projectId: input.projectId,
        versionName: input.versionName,
        fileName,
        uploadedBy: input.uploadedBy,
        rawText: text,
        rawParseJson: parsed as unknown as Prisma.InputJsonValue,
        file: {
          create: {
            projectId: input.projectId,
            fileName,
            mimeType,
            kind: getFileKind(fileName),
            sizeBytes: storedUpload.sizeBytes,
            storagePath: storedUpload.storagePath,
            checksum: storedUpload.checksum,
            extractionStatus: "extracted"
          }
        }
      }
    });

    for (const scene of parsed.scenes) {
      const parsedScene = await tx.parsedScene.create({
        data: {
          scriptVersionId: scriptVersion.id,
          projectId: input.projectId,
          sceneNumber: scene.number,
          slugline: scene.slugline,
          interiorExterior: scene.interiorExterior,
          location: scene.location,
          timeOfDay: scene.timeOfDay,
          text: scene.text,
          actionText: scene.actionText,
          pageEstimate: scene.pageEstimate,
          riskLevel: mapRisk(scene.riskLevel),
          rawSceneJson: scene as unknown as Prisma.InputJsonValue
        }
      });

      for (const name of scene.characters) {
        const character = await tx.character.upsert({
          where: { projectId_name: { projectId: input.projectId, name } },
          create: { projectId: input.projectId, name },
          update: {}
        });
        await tx.sceneCharacter.create({ data: { parsedSceneId: parsedScene.id, characterId: character.id } });
      }

      for (const name of scene.environments) {
        const environment = await tx.environment.upsert({
          where: { projectId_name: { projectId: input.projectId, name } },
          create: { projectId: input.projectId, name },
          update: {}
        });
        await tx.sceneEnvironment.create({ data: { parsedSceneId: parsedScene.id, environmentId: environment.id } });
      }

      for (const name of scene.props) {
        const prop = await tx.prop.upsert({
          where: { projectId_name: { projectId: input.projectId, name } },
          create: { projectId: input.projectId, name },
          update: {}
        });
        await tx.sceneProp.create({ data: { parsedSceneId: parsedScene.id, propId: prop.id } });
      }
    }

    await tx.project.update({
      where: { id: input.projectId },
      data: { currentScriptVersion: input.versionName }
    });

    await tx.auditLog.create({
      data: {
        projectId: input.projectId,
        actor: input.uploadedBy,
        action: "script.uploaded",
        entityType: "ScriptVersion",
        entityId: scriptVersion.id,
        detailJson: { fileName, versionName: input.versionName, scenes: parsed.scenes.length }
      }
    });

    return scriptVersion;
  });

  const persistedDiff = previousVersion ? await persistScriptDiff(input.projectId, previousVersion.id, created.id, parsed, toParsedVersion(previousVersion)) : null;

  return {
    scriptVersionId: created.id,
    parsed,
    diff: persistedDiff
  };
}

async function recordOcrRequiredUpload(
  input: IngestScriptInput,
  upload: {
    fileName: string;
    mimeType: string;
    storedUpload: Awaited<ReturnType<typeof storeUpload>>;
    message: string;
  }
) {
  const scriptVersion = await prisma.scriptVersion.create({
    data: {
      projectId: input.projectId,
      versionName: input.versionName,
      fileName: upload.fileName,
      uploadedBy: input.uploadedBy,
      rawParseJson: { ocrRequired: true, message: upload.message },
      file: {
        create: {
          projectId: input.projectId,
          fileName: upload.fileName,
          mimeType: upload.mimeType,
          kind: getFileKind(upload.fileName),
          sizeBytes: upload.storedUpload.sizeBytes,
          storagePath: upload.storedUpload.storagePath,
          checksum: upload.storedUpload.checksum,
          extractionStatus: "ocr_required",
          extractionError: upload.message,
          ocrRequestedAt: new Date()
        }
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      projectId: input.projectId,
      actor: input.uploadedBy,
      action: "script.ocr_required",
      entityType: "ScriptVersion",
      entityId: scriptVersion.id,
      detailJson: {
        fileName: upload.fileName,
        versionName: input.versionName,
        storagePath: upload.storedUpload.storagePath,
        message: upload.message
      }
    }
  });

  return {
    scriptVersionId: scriptVersion.id,
    parsed: null,
    diff: null,
    ocrRequired: true,
    message: upload.message
  };
}

async function persistScriptDiff(projectId: string, fromScriptVersionId: string, toScriptVersionId: string, current: ParsedScriptVersion, previous: ParsedScriptVersion) {
  const diff = buildScriptDiff(previous, current);

  await prisma.scriptDiff.create({
    data: {
      projectId,
      fromScriptVersionId,
      toScriptVersionId,
      summaryJson: diff as unknown as Prisma.InputJsonValue,
      sceneDiffs: {
        create: diff.diffs.map((sceneDiff) => ({
          sceneNumber: sceneDiff.sceneNumber,
          status: sceneDiff.status,
          beforeSlugline: sceneDiff.beforeSlugline,
          afterSlugline: sceneDiff.afterSlugline,
          locationChanged: sceneDiff.locationChanged,
          riskLevel: mapRisk(sceneDiff.riskLevel),
          rawDiffJson: sceneDiff as unknown as Prisma.InputJsonValue
        }))
      }
    }
  });

  return diff;
}

async function extractUploadText(fileName: string, mimeType: string, bytes: Buffer) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".pdf") || mimeType === "application/pdf") {
    return extractPdfTextOnServer(bytes);
  }

  return bytes.toString("utf8");
}

async function extractPdfTextOnServer(bytes: Buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true } as Parameters<typeof pdfjs.getDocument>[0]).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).filter(Boolean).join("\n"));
  }

  const text = pages.join("\n\n").trim();
  if (!text) {
    throw new OcrRequiredError();
  }
  return text;
}

function parseUploadedScript(text: string, options: { projectId: string; versionName: string; fileName: string }) {
  if (options.fileName.toLowerCase().endsWith(".fdx")) {
    return parseFdxText(text, options);
  }
  return parseScriptText(text, options);
}

function getFileKind(fileName: string) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".fdx")) return "fdx" as const;
  if (lowerName.endsWith(".pdf")) return "pdf" as const;
  if (lowerName.endsWith(".txt") || lowerName.endsWith(".text")) return "txt" as const;
  if (lowerName.endsWith(".docx")) return "docx" as const;
  return "other" as const;
}

function mapRisk(level: RiskLevel) {
  return level;
}

function toParsedVersion(version: {
  id: string;
  projectId: string;
  versionName: string;
  fileName: string;
  uploadedAt: Date;
  parsedScenes: Array<{
    id: string;
    sceneNumber: number;
    slugline: string;
    interiorExterior: string;
    location: string;
    timeOfDay: string;
    text: string;
    actionText: string;
    pageEstimate: number;
    riskLevel: RiskLevel;
    characters: Array<{ character: { name: string } }>;
    environments: Array<{ environment: { name: string } }>;
    props: Array<{ prop: { name: string } }>;
  }>;
}): ParsedScriptVersion {
  const scenes = version.parsedScenes.map((scene) => ({
    id: scene.id,
    number: scene.sceneNumber,
    slugline: scene.slugline,
    interiorExterior: scene.interiorExterior,
    location: scene.location,
    timeOfDay: scene.timeOfDay,
    text: scene.text,
    actionText: scene.actionText,
    characters: scene.characters.map((item) => item.character.name),
    environments: scene.environments.map((item) => item.environment.name),
    props: scene.props.map((item) => item.prop.name),
    stuntBeats: [],
    vfxBeats: [],
    pageEstimate: scene.pageEstimate,
    riskLevel: scene.riskLevel
  }));

  return {
    id: version.id,
    projectId: version.projectId,
    versionName: version.versionName,
    fileName: version.fileName,
    uploadedAt: version.uploadedAt.toISOString(),
    scenes,
    characters: Array.from(new Set(scenes.flatMap((scene) => scene.characters))).sort(),
    environments: Array.from(new Set(scenes.flatMap((scene) => scene.environments))).sort(),
    props: Array.from(new Set(scenes.flatMap((scene) => scene.props))).sort(),
    stuntBeats: [],
    vfxBeats: []
  };
}
