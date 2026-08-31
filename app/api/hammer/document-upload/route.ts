import { NextResponse } from "next/server";
import type { DocumentType, Prisma } from "@prisma/client";
import { forbidden, isDatabaseConfigured, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storeUpload } from "@/lib/server-file-storage";
import { extractPdfTextWithFallback } from "@/lib/server-pdf-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const documentTypes: DocumentType[] = ["SCRIPT", "TREATMENT", "OUTLINE", "NOTES", "COVERAGE", "BUSINESS_DOCUMENT"];
const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;
const UPLOAD_POLICY_KEY = "upload.policy";
const defaultUploadPolicy = {
  maxUploadMb: 250,
  allowedExtensions: [".pdf", ".fdx", ".txt", ".md"],
  allowDocx: false,
  parseOnUpload: true,
  warnOnEmptyText: true
};

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let uploadJobId = "";
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database mode is not configured." }, { status: 503 });

  let uploadStage = "preparing upload";
  try {
    uploadStage = "reading form data";
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF, FDX, TXT, or MD file first." }, { status: 400 });
    const uploadPolicy = await getUploadPolicy();
    const maxUploadBytes = Math.min(uploadPolicy.maxUploadMb * 1024 * 1024, MAX_UPLOAD_BYTES);
    if (file.size > maxUploadBytes) return NextResponse.json({ error: `Uploads must be ${Math.round(maxUploadBytes / 1024 / 1024)}MB or smaller.` }, { status: 400 });
    if (!isAllowedScriptUploadFile(file, uploadPolicy)) {
      return NextResponse.json({ error: `Unsupported file type. Upload ${uploadPolicy.allowedExtensions.join(", ")}${uploadPolicy.allowDocx ? ", or .docx" : ""}.` }, { status: 400 });
    }

    const uploader = await prisma.user.findUnique({ where: { id: auth.user.id }, select: { id: true } });
    if (!uploader) return NextResponse.json({ error: "Your login session no longer matches an active user. Sign out and back in, then try again." }, { status: 401 });

    const documentId = optionalString(formData.get("documentId"));
    const requestedProjectId = optionalString(formData.get("projectId"));
    const existingDocument = documentId
      ? await prisma.document.findUnique({ where: { id: documentId }, include: { versions: true } })
      : null;

    if (documentId && (!existingDocument || existingDocument.deletedAt)) {
      return NextResponse.json({ error: "The selected document no longer exists." }, { status: 404 });
    }

    const projectId = existingDocument?.projectId ?? requestedProjectId;
    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, deletedAt: true } });
      if (!project || project.deletedAt) return NextResponse.json({ error: "The selected project no longer exists." }, { status: 404 });
    }

    if (!canUploadDocument(auth.user.appRole, auth.user.projectRoles, projectId)) {
      return NextResponse.json(forbidden(), { status: 403 });
    }

    const fileName = file.name || "uploaded-document";
    const fileType = file.type || inferFileType(fileName);
    const initialNotes = optionalString(formData.get("notes"));
    uploadStage = "recording upload job";
    const uploadJob = await prisma.uploadJob.create({
      data: {
        requestId,
        status: "RECEIVED",
        stage: "received",
        fileName,
        fileType,
        fileSize: file.size,
        projectId,
        documentId: existingDocument?.id,
        createdById: auth.user.id,
        detailJson: { documentId: existingDocument?.id ?? null, requestedProjectId: requestedProjectId ?? null } as Prisma.InputJsonValue
      }
    });
    uploadJobId = uploadJob.id;

    const bytes = Buffer.from(await file.arrayBuffer());
    uploadStage = "storing uploaded file";
    const storedUpload = await storeUpload(projectId ?? "inbox", fileName, bytes);
    await updateUploadJob(uploadJobId, {
      status: "STORED",
      stage: "stored",
      storagePath: storedUpload.storagePath,
      fileSize: storedUpload.sizeBytes
    });
    const now = new Date();

    uploadStage = "saving document metadata";
    const result = await prisma.$transaction(async (tx) => {
      const queuedNote = uploadPolicy.parseOnUpload
        ? "Text extraction is queued. The original file has been stored and GreenLight will update this version when parsing finishes."
        : "Text extraction is disabled by the current upload policy. The original file has been stored.";
      const document = existingDocument ?? await tx.document.create({
        data: {
          projectId,
          title: stringField(formData.get("title")) || stripExtension(fileName) || "Untitled Document",
          type: documentTypeField(formData.get("type")),
          writerName: optionalString(formData.get("writerName")),
          source: optionalString(formData.get("source")),
          submittedAt: projectId ? undefined : now,
          createdById: auth.user.id
        },
        include: { versions: true }
      });

      const nextVersionNumber = document.versions.length ? Math.max(...document.versions.map((version) => version.versionNumber)) + 1 : 1;
      const version = await tx.documentVersion.create({
        data: {
          documentId: document.id,
          versionNumber: nextVersionNumber,
          status: "DRAFT",
          fileName,
          fileType,
          fileSize: storedUpload.sizeBytes,
          storagePath: storedUpload.storagePath,
          extractedText: "",
          uploadedById: auth.user.id,
          notes: combineUploadNotes(initialNotes, queuedNote)
        }
      });

      await tx.uploadJob.update({
        where: { id: uploadJobId },
        data: {
          status: uploadPolicy.parseOnUpload ? "PARSING" : "COMPLETE",
          stage: uploadPolicy.parseOnUpload ? "parsing" : "complete",
          documentId: document.id,
          documentVersionId: version.id,
          storagePath: storedUpload.storagePath,
          completedAt: uploadPolicy.parseOnUpload ? undefined : now,
          detailJson: { documentId: document.id, versionId: version.id, versionNumber: nextVersionNumber, fileName, projectId: projectId ?? null } as Prisma.InputJsonValue
        }
      });

      const updatedDocument = await tx.document.update({
        where: { id: document.id },
        data: {
          currentVersionId: version.id,
          title: stringField(formData.get("title")) || document.title,
          type: documentTypeField(formData.get("type")),
          writerName: optionalString(formData.get("writerName")) ?? document.writerName,
          source: formData.has("source") ? optionalString(formData.get("source")) ?? null : document.source,
          updatedAt: now
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: auth.user.id,
          actor: auth.user.email,
          action: existingDocument ? "document.version_uploaded" : "document.created",
          entityType: "Document",
          entityId: document.id,
          detailJson: { fileName, projectId, versionNumber: nextVersionNumber, storagePath: storedUpload.storagePath, extractionQueued: uploadPolicy.parseOnUpload } as Prisma.InputJsonValue
        }
      });

      return { document: updatedDocument, version };
    });

    if (uploadPolicy.parseOnUpload) {
      void extractAndPersistUploadText({
        requestId,
        versionId: result.version.id,
        documentId: result.document.id,
        uploadJobId,
        fileName,
        fileType,
        bytes,
        initialNotes,
        warnOnEmptyText: uploadPolicy.warnOnEmptyText,
        actorUserId: auth.user.id,
        actor: auth.user.email
      });
    }

    return NextResponse.json({
      document: toDocument(result.document),
      version: toVersion(result.version),
      uploadJob: toUploadJob(await prisma.uploadJob.findUnique({ where: { id: uploadJobId } })),
      warning: uploadPolicy.parseOnUpload
        ? "Upload saved. Text extraction is running in the background; refresh the document in a moment to see parsed text, breakdown, and diff support."
        : "Upload saved. Text extraction is disabled by the current upload policy.",
      extractionQueued: uploadPolicy.parseOnUpload
    }, { status: 201 });
  } catch (error) {
    const detail = uploadErrorMessage(error);
    const status = uploadErrorStatus(uploadStage, detail);
    const hint = uploadErrorHint(uploadStage, detail);
    if (uploadJobId) {
      await updateUploadJob(uploadJobId, {
        status: "FAILED",
        stage: uploadStage,
        error: `${detail}${hint ? ` ${hint}` : ""}`,
        completedAt: new Date()
      }).catch((jobError) => console.error("[document-upload:job-failed-update]", { requestId, uploadJobId, error: jobError }));
    }
    console.error("[document-upload]", { requestId, uploadStage, status, detail, hint, error });
    return NextResponse.json({
      error: "Document upload failed.",
      stage: uploadStage,
      detail,
      hint,
      requestId
    }, { status });
  }
}

export async function GET(request: Request) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database mode is not configured." }, { status: 503 });

  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId")?.trim();
  const requestId = url.searchParams.get("requestId")?.trim();
  const recent = url.searchParams.get("recent") === "1";
  const projectId = url.searchParams.get("projectId")?.trim();
  const documentId = url.searchParams.get("documentId")?.trim();

  if (recent) {
    if (!canUploadDocument(auth.user.appRole, auth.user.projectRoles, projectId || undefined)) {
      return NextResponse.json(forbidden(), { status: 403 });
    }
    const uploadJobs = await prisma.uploadJob.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(documentId ? { documentId } : {}),
        ...(!projectId && !documentId && !canManageUploads(auth.user.appRole) ? { createdById: auth.user.id } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        documentVersion: { select: { id: true, documentId: true, extractedText: true, notes: true } }
      }
    });
    return NextResponse.json({ uploadJobs: uploadJobs.map(toUploadJob) });
  }

  if (!jobId && !requestId) return NextResponse.json({ error: "Upload job id is required." }, { status: 400 });

  const job = await prisma.uploadJob.findFirst({
    where: jobId ? { id: jobId } : { requestId: requestId! },
    include: {
      documentVersion: { select: { id: true, documentId: true, extractedText: true, notes: true } }
    }
  });

  if (!job) return NextResponse.json({ error: "Upload job was not found." }, { status: 404 });
  if (!canUploadDocument(auth.user.appRole, auth.user.projectRoles, job.projectId ?? undefined) && job.createdById !== auth.user.id) {
    return NextResponse.json(forbidden(), { status: 403 });
  }

  return NextResponse.json({ uploadJob: toUploadJob(job) });
}

function canUploadDocument(role: string, projectRoles: Record<string, string>, projectId?: string) {
  const normalizedRole = role.toLowerCase();
  if (normalizedRole === "admin" || normalizedRole === "producer" || normalizedRole === "executive" || normalizedRole === "exec") return true;
  return Boolean(projectId && projectRoles[projectId]);
}

function canManageUploads(role: string) {
  const normalizedRole = role.toLowerCase();
  return normalizedRole === "admin" || normalizedRole === "producer" || normalizedRole === "executive" || normalizedRole === "exec";
}

async function extractAndPersistUploadText(input: {
  requestId: string;
  versionId: string;
  documentId: string;
  uploadJobId: string;
  fileName: string;
  fileType: string;
  bytes: Buffer;
  initialNotes?: string;
  warnOnEmptyText: boolean;
  actorUserId: string;
  actor: string;
}) {
  try {
    const extraction = await extractUploadText(input.fileName, input.fileType, input.bytes, input.warnOnEmptyText);
    const uploadStatus = extraction.warning ? "WARNING" : "COMPLETE";
    await prisma.$transaction(async (tx) => {
      await tx.documentVersion.update({
        where: { id: input.versionId },
        data: {
          extractedText: extraction.text,
          notes: combineUploadNotes(input.initialNotes, extraction.warning)
        }
      });
      await tx.uploadJob.update({
        where: { id: input.uploadJobId },
        data: {
          status: uploadStatus,
          stage: "complete",
          warning: extraction.warning,
          error: null,
          completedAt: new Date(),
          detailJson: { documentId: input.documentId, versionId: input.versionId, fileName: input.fileName, extractedChars: extraction.text.length, extractionWarning: extraction.warning ?? null } as Prisma.InputJsonValue
        }
      });
      await tx.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          actor: input.actor,
          action: "document.text_extracted",
          entityType: "DocumentVersion",
          entityId: input.versionId,
          detailJson: { documentId: input.documentId, fileName: input.fileName, extractedChars: extraction.text.length, extractionWarning: extraction.warning } as Prisma.InputJsonValue
        }
      });
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown extraction error.";
    const warning = `Uploaded successfully, but text extraction failed in the background. The original file is stored; parser/OCR can be retried later. Details: ${detail}`;
    console.error("[document-upload:background-extract]", { requestId: input.requestId, versionId: input.versionId, detail, error });
    await prisma.$transaction([
      prisma.documentVersion.update({
        where: { id: input.versionId },
        data: {
          extractedText: "",
          notes: combineUploadNotes(input.initialNotes, warning)
        }
      }),
      prisma.uploadJob.update({
        where: { id: input.uploadJobId },
        data: {
          status: "WARNING",
          stage: "complete",
          warning,
          error: detail,
          completedAt: new Date(),
          detailJson: { documentId: input.documentId, versionId: input.versionId, fileName: input.fileName, extractionError: detail } as Prisma.InputJsonValue
        }
      })
    ]).catch((updateError) => {
      console.error("[document-upload:background-extract:update-failed]", { requestId: input.requestId, versionId: input.versionId, error: updateError });
    });
  }
}

async function updateUploadJob(id: string, data: Parameters<typeof prisma.uploadJob.update>[0]["data"]) {
  if (!id) return null;
  return prisma.uploadJob.update({ where: { id }, data });
}

async function extractUploadText(fileName: string, fileType: string, bytes: Buffer, warnOnEmptyText = true) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".pdf") || fileType === "application/pdf") {
    try {
      return await extractPdfTextWithFallback(bytes);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown extraction error.";
      return {
        text: "",
        warning: `Uploaded successfully, but no readable script text could be extracted. This PDF may be image-only or include scanned pages; OCR may be needed before breakdown or diff can run. Details: ${detail}`
      };
    }
  }
  if (lowerName.endsWith(".fdx") || lowerName.endsWith(".txt") || lowerName.endsWith(".md") || fileType.startsWith("text/")) {
    const text = bytes.toString("utf8").trim();
    return {
      text,
      warning: text || !warnOnEmptyText ? undefined : "Uploaded successfully, but the file did not contain readable text. Add a text-based version before running breakdown or diff."
    };
  }
  if (lowerName.endsWith(".docx") || fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return {
      text: "",
      warning: warnOnEmptyText ? "DOCX was stored, but DOCX text parsing is disabled for now. Upload PDF, FDX, TXT, or MD for breakdown and diff support." : undefined
    };
  }
  throw new Error("Unsupported file type. Upload PDF, FDX, TXT, or MD.");
}

function isAllowedScriptUploadFile(file: File, uploadPolicy: typeof defaultUploadPolicy) {
  const lowerName = file.name.toLowerCase();
  const allowedExtensions = new Set(uploadPolicy.allowedExtensions.map((extension) => extension.toLowerCase()));
  if (allowedExtensions.has(".docx") && !uploadPolicy.allowDocx) allowedExtensions.delete(".docx");
  const extensionAllowed = Array.from(allowedExtensions).some((extension) => lowerName.endsWith(extension));
  const mimeAllowed =
    (allowedExtensions.has(".pdf") && file.type === "application/pdf") ||
    (allowedExtensions.has(".txt") && file.type === "text/plain") ||
    (allowedExtensions.has(".md") && file.type === "text/markdown") ||
    (uploadPolicy.allowDocx && file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  return extensionAllowed || mimeAllowed;
}

async function getUploadPolicy() {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: UPLOAD_POLICY_KEY } });
    return normalizeUploadPolicy(setting?.valueJson);
  } catch {
    return defaultUploadPolicy;
  }
}

function normalizeUploadPolicy(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const extensions = Array.isArray(record.allowedExtensions)
    ? record.allowedExtensions.filter((item): item is string => typeof item === "string").map(normalizeUploadExtension).filter(Boolean)
    : typeof record.allowedExtensions === "string"
      ? record.allowedExtensions.split(/[,\s]+/).map(normalizeUploadExtension).filter(Boolean)
      : defaultUploadPolicy.allowedExtensions;
  return {
    maxUploadMb: clampUploadNumber(record.maxUploadMb, 1, 500, defaultUploadPolicy.maxUploadMb),
    allowedExtensions: Array.from(new Set(extensions.length ? extensions : defaultUploadPolicy.allowedExtensions)),
    allowDocx: typeof record.allowDocx === "boolean" ? record.allowDocx : defaultUploadPolicy.allowDocx,
    parseOnUpload: typeof record.parseOnUpload === "boolean" ? record.parseOnUpload : defaultUploadPolicy.parseOnUpload,
    warnOnEmptyText: typeof record.warnOnEmptyText === "boolean" ? record.warnOnEmptyText : defaultUploadPolicy.warnOnEmptyText
  };
}

function normalizeUploadExtension(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  return normalized.startsWith(".") ? normalized : `.${normalized}`;
}

function clampUploadNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function combineUploadNotes(notes: string | undefined, warning: string | undefined) {
  if (!warning) return notes;
  const warningNote = `Upload warning: ${warning}`;
  return notes ? `${notes}\n\n${warningNote}` : warningNote;
}

function uploadErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Document upload failed.";
}

function uploadErrorStatus(stage: string, detail: string) {
  const normalized = detail.toLowerCase();
  if (stage.includes("form data") || normalized.includes("body exceeded") || normalized.includes("request entity too large") || normalized.includes("413")) return 413;
  if (normalized.includes("unsupported file type")) return 400;
  if (normalized.includes("not found") || normalized.includes("no longer exists")) return 404;
  if (normalized.includes("foreign key") || normalized.includes("constraint") || normalized.includes("unique constraint")) return 409;
  if (stage.includes("storing") || normalized.includes("gcs") || normalized.includes("bucket") || normalized.includes("credential") || normalized.includes("permission")) return 503;
  return 500;
}

function uploadErrorHint(stage: string, detail: string) {
  const normalized = detail.toLowerCase();
  if (stage.includes("form data") || normalized.includes("body exceeded") || normalized.includes("request entity too large")) {
    return "The request body was rejected before GreenLight could process it. Check Nginx client_max_body_size and any proxy/body-size limits.";
  }
  if (stage.includes("storing") || normalized.includes("gcs") || normalized.includes("bucket") || normalized.includes("credential") || normalized.includes("permission")) {
    return "GreenLight could not store the uploaded file. Check UPLOAD_STORAGE_DRIVER, GCS bucket name, service account credentials, and bucket write permissions.";
  }
  if (stage.includes("extracting") || normalized.includes("pdf") || normalized.includes("worker") || normalized.includes("tesseract") || normalized.includes("pdftoppm")) {
    return "The file was accepted but text extraction failed. The original file may still be valid; check PDF parser/OCR dependencies in the container.";
  }
  if (stage.includes("metadata") || normalized.includes("foreign key") || normalized.includes("constraint") || normalized.includes("prisma")) {
    return "The file was processed but database metadata could not be saved. Check that migrations are deployed and the selected project/document still exists.";
  }
  return "Check the app container logs for the matching request ID, then retry the upload.";
}

function toDocument(document: { id: string; projectId: string | null; title: string; type: DocumentType; currentVersionId: string | null; createdById: string | null; updatedAt: Date; writerName: string | null; source: string | null; contactId: string | null; submittedAt: Date | null }) {
  return { id: document.id, projectId: document.projectId ?? undefined, title: document.title, type: document.type, currentVersionId: document.currentVersionId ?? "", createdById: document.createdById ?? "", updatedAt: dateString(document.updatedAt), writerName: document.writerName ?? undefined, source: document.source ?? undefined, contactId: document.contactId ?? undefined, submittedAt: document.submittedAt ? dateString(document.submittedAt) : undefined };
}

function toVersion(version: { id: string; documentId: string; versionNumber: number; status: string; fileName: string; fileType: string; fileSize: number; storagePath: string; dataUrl?: string | null; uploadedById: string | null; createdAt: Date; notes: string | null; markdownNotes?: string | null; extractedText: string | null }) {
  return { id: version.id, documentId: version.documentId, versionNumber: version.versionNumber, status: version.status, fileName: version.fileName, fileType: version.fileType, fileSize: version.fileSize, storagePath: version.storagePath, dataUrl: version.dataUrl ?? undefined, uploadedById: version.uploadedById ?? "", createdAt: dateString(version.createdAt), notes: version.notes ?? "", markdownNotes: version.markdownNotes ?? undefined, extractedText: version.extractedText ?? "" };
}

function toUploadJob(job: ({ id: string; requestId: string; status: string; stage: string; fileName: string; fileType: string; fileSize: number; storagePath: string | null; projectId: string | null; documentId: string | null; documentVersionId: string | null; warning: string | null; error: string | null; createdAt: Date; updatedAt: Date; completedAt: Date | null; documentVersion?: { id: string; documentId: string; extractedText: string | null; notes: string | null } | null } | null)) {
  if (!job) return undefined;
  return {
    id: job.id,
    requestId: job.requestId,
    status: job.status,
    stage: job.stage,
    fileName: job.fileName,
    fileType: job.fileType,
    fileSize: job.fileSize,
    storagePath: job.storagePath ?? undefined,
    projectId: job.projectId ?? undefined,
    documentId: job.documentId ?? undefined,
    documentVersionId: job.documentVersionId ?? undefined,
    warning: job.warning ?? undefined,
    error: job.error ?? undefined,
    characterCount: job.documentVersion?.extractedText?.length ?? 0,
    versionNotes: job.documentVersion?.notes ?? undefined,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString()
  };
}

function documentTypeField(value: FormDataEntryValue | null): DocumentType {
  const type = stringField(value).toUpperCase();
  return documentTypes.includes(type as DocumentType) ? type as DocumentType : "SCRIPT";
}

function optionalString(value: FormDataEntryValue | null) {
  const string = stringField(value);
  return string || undefined;
}

function stringField(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function inferFileType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "fdx") return "application/xml";
  if (extension === "md") return "text/markdown";
  return "text/plain";
}

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}
