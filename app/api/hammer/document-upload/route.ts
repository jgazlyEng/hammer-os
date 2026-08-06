import { NextResponse } from "next/server";
import type { DocumentType, Prisma } from "@prisma/client";
import { forbidden, isDatabaseConfigured, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storeUpload } from "@/lib/server-file-storage";
import { extractPdfTextWithFallback } from "@/lib/server-pdf-text";

export const runtime = "nodejs";

const documentTypes: DocumentType[] = ["SCRIPT", "TREATMENT", "OUTLINE", "NOTES", "COVERAGE", "BUSINESS_DOCUMENT"];
const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database mode is not configured." }, { status: 503 });

  let uploadStage = "preparing upload";
  try {
    uploadStage = "reading form data";
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF, FDX, TXT, or MD file first." }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Uploads must be 250MB or smaller." }, { status: 400 });
    if (!isAllowedScriptUploadFile(file)) {
      return NextResponse.json({ error: "DOCX script parsing is disabled for now. Upload PDF, FDX, TXT, or MD instead." }, { status: 400 });
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
    const bytes = Buffer.from(await file.arrayBuffer());
    uploadStage = "storing uploaded file";
    const storedUpload = await storeUpload(projectId ?? "inbox", fileName, bytes);
    uploadStage = "extracting script text";
    const extraction = await extractUploadText(fileName, fileType, bytes);
    const extractedText = extraction.text;
    const uploadNotes = combineUploadNotes(optionalString(formData.get("notes")), extraction.warning);
    const now = new Date();

    uploadStage = "saving document metadata";
    const result = await prisma.$transaction(async (tx) => {
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
          extractedText,
          uploadedById: auth.user.id,
          notes: uploadNotes
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
          detailJson: { fileName, projectId, versionNumber: nextVersionNumber, extractionWarning: extraction.warning } as Prisma.InputJsonValue
        }
      });

      return { document: updatedDocument, version };
    });

    return NextResponse.json({
      document: toDocument(result.document),
      version: toVersion(result.version),
      warning: extraction.warning
    }, { status: 201 });
  } catch (error) {
    const detail = uploadErrorMessage(error);
    const hint = uploadErrorHint(uploadStage, detail);
    console.error("[document-upload]", { requestId, uploadStage, detail, hint, error });
    return NextResponse.json({
      error: "Document upload failed.",
      stage: uploadStage,
      detail,
      hint,
      requestId
    }, { status: 500 });
  }
}

function canUploadDocument(role: string, projectRoles: Record<string, string>, projectId?: string) {
  const normalizedRole = role.toLowerCase();
  if (normalizedRole === "admin" || normalizedRole === "producer" || normalizedRole === "executive" || normalizedRole === "exec") return true;
  return Boolean(projectId && projectRoles[projectId]);
}

async function extractUploadText(fileName: string, fileType: string, bytes: Buffer) {
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
      warning: text ? undefined : "Uploaded successfully, but the file did not contain readable text. Add a text-based version before running breakdown or diff."
    };
  }
  throw new Error("Unsupported file type. Upload PDF, FDX, TXT, or MD.");
}

function isAllowedScriptUploadFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith(".pdf") || lowerName.endsWith(".fdx") || lowerName.endsWith(".txt") || lowerName.endsWith(".md") || file.type === "application/pdf" || file.type === "text/plain" || file.type === "text/markdown";
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
