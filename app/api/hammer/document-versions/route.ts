import { NextResponse } from "next/server";
import type { DocumentVersionStatus, Prisma } from "@prisma/client";
import { forbidden, isDatabaseConfigured, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeSummary } from "@/lib/script-coverage";

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
    orderBy: { createdAt: "desc" },
    include: { coverage: true }
  });

  return NextResponse.json({ mode: "database", versions: versions.map(toVersion) });
}

function toVersion(version: { id: string; documentId: string; versionNumber: number; status: DocumentVersionStatus; fileName: string; fileType: string; fileSize: number; storagePath: string; dataUrl?: string | null; uploadedById: string | null; createdAt: Date; notes: string | null; markdownNotes?: string | null; extractedText?: string | null; coverage?: ScriptCoverageRecord | null }) {
  return { id: version.id, documentId: version.documentId, versionNumber: version.versionNumber, status: version.status, fileName: version.fileName, fileType: version.fileType, fileSize: version.fileSize, storagePath: version.storagePath, dataUrl: version.dataUrl ?? undefined, uploadedById: version.uploadedById ?? "", createdAt: dateString(version.createdAt), notes: version.notes ?? "", markdownNotes: version.markdownNotes ?? undefined, extractedText: version.extractedText ?? "", coverage: version.coverage ? toScriptCoverage(version.coverage) : undefined };
}

type ScriptCoverageRecord = {
  id: string;
  documentVersionId: string;
  aiStatus: string;
  aiModel: string | null;
  aiSummaryJson: Prisma.JsonValue | null;
  aiGeneratedAt: Date | null;
  humanOverallScore: number | null;
  humanRecommendation: string | null;
  humanCriteriaJson: Prisma.JsonValue | null;
  humanNotes: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toScriptCoverage(coverage: ScriptCoverageRecord) {
  return {
    id: coverage.id,
    documentVersionId: coverage.documentVersionId,
    aiStatus: coverage.aiStatus,
    aiModel: coverage.aiModel ?? undefined,
    aiSummary: coverage.aiSummaryJson ? normalizeSummary(coverage.aiSummaryJson) : undefined,
    aiGeneratedAt: coverage.aiGeneratedAt ? dateString(coverage.aiGeneratedAt) : undefined,
    humanOverallScore: coverage.humanOverallScore ?? undefined,
    humanRecommendation: coverage.humanRecommendation ?? undefined,
    humanCriteria: normalizeHumanCriteria(coverage.humanCriteriaJson),
    humanNotes: coverage.humanNotes ?? undefined,
    createdById: coverage.createdById ?? undefined,
    updatedById: coverage.updatedById ?? undefined,
    updatedAt: dateString(coverage.updatedAt)
  };
}

function normalizeHumanCriteria(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    concept: nullableScore(record.concept),
    character: nullableScore(record.character),
    structure: nullableScore(record.structure),
    dialogue: nullableScore(record.dialogue),
    originality: nullableScore(record.originality),
    marketability: nullableScore(record.marketability),
    budgetFeasibility: nullableScore(record.budgetFeasibility),
    packagingPotential: nullableScore(record.packagingPotential)
  };
}

function nullableScore(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(1, Math.min(10, Math.round(number)));
}

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function canManageLibrary(role: string) {
  return ["admin", "producer", "executive"].includes(role);
}
