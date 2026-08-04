import { NextResponse } from "next/server";
import type { DocumentVersionStatus } from "@prisma/client";
import { forbidden, isDatabaseConfigured, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDatabaseConfigured()) return NextResponse.json({ mode: "demo", versions: [] });

  const url = new URL(request.url);
  const documentId = url.searchParams.get("documentId")?.trim();
  if (!documentId) return NextResponse.json({ error: "Document id is required." }, { status: 400 });

  const document = await prisma.document.findFirst({
    where: { id: documentId, deletedAt: null },
    select: { id: true, projectId: true }
  });
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  const canViewDocumentText = canManageLibrary(auth.user.appRole) || (document.projectId ? Boolean(auth.user.projectRoles[document.projectId]) : false);
  if (!canViewDocumentText) return NextResponse.json(forbidden(), { status: 403 });

  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ mode: "database", versions: versions.map(toVersion) });
}

function toVersion(version: { id: string; documentId: string; versionNumber: number; status: DocumentVersionStatus; fileName: string; fileType: string; fileSize: number; storagePath: string; dataUrl?: string | null; uploadedById: string | null; createdAt: Date; notes: string | null; markdownNotes?: string | null; extractedText?: string | null }) {
  return { id: version.id, documentId: version.documentId, versionNumber: version.versionNumber, status: version.status, fileName: version.fileName, fileType: version.fileType, fileSize: version.fileSize, storagePath: version.storagePath, dataUrl: version.dataUrl ?? undefined, uploadedById: version.uploadedById ?? "", createdAt: dateString(version.createdAt), notes: version.notes ?? "", markdownNotes: version.markdownNotes ?? undefined, extractedText: version.extractedText ?? "" };
}

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function canManageLibrary(role: string) {
  return ["admin", "producer", "executive"].includes(role);
}
