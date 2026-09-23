import { NextResponse } from "next/server";
import type { BreakdownElementStatus, BreakdownRunStatus, Prisma } from "@prisma/client";
import { forbidden, isDatabaseConfigured, requireUser, type AuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getBreakdownRun,
  listBreakdownRuns,
  runProductionBreakdown,
  updateBreakdownElementStatus,
  updateBreakdownRunStatus,
  type ProductionBreakdownRunRecord
} from "@/lib/production-breakdown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ActionBody = Record<string, unknown> & { action?: string };

export async function GET(request: Request) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDatabaseConfigured()) return NextResponse.json({ mode: "demo", runs: [] });

  const url = new URL(request.url);
  const documentVersionId = url.searchParams.get("documentVersionId")?.trim();
  if (!documentVersionId) return NextResponse.json({ error: "Document version id is required." }, { status: 400 });

  const access = await accessForDocumentVersion(auth.user, documentVersionId);
  if (!access.allowed) return NextResponse.json(access.notFound ? { error: "Script version not found." } : forbidden(), { status: access.notFound ? 404 : 403 });

  const runs = await listBreakdownRuns(documentVersionId);
  return NextResponse.json({ mode: "database", runs: runs.map(toBreakdownRun) });
}

export async function POST(request: Request) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database mode is not configured." }, { status: 503 });

  const body = await request.json() as ActionBody;
  const documentVersionId = stringField(body.documentVersionId);
  if (!documentVersionId) return NextResponse.json({ error: "Document version id is required." }, { status: 400 });

  const access = await accessForDocumentVersion(auth.user, documentVersionId);
  if (!access.allowed) return NextResponse.json(access.notFound ? { error: "Script version not found." } : forbidden(), { status: access.notFound ? 404 : 403 });
  if (!canRunBreakdown(auth.user, access.projectId)) return NextResponse.json(forbidden(), { status: 403 });

  const run = await runProductionBreakdown({ documentVersionId, userId: auth.user.id });
  return NextResponse.json({ mode: "database", run: run ? toBreakdownRun(run) : null }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database mode is not configured." }, { status: 503 });

  const body = await request.json() as ActionBody;
  const action = stringField(body.action);

  if (action === "updateRunStatus") {
    const runId = stringField(body.runId);
    const status = runStatusField(body.status);
    if (!runId || !status) return NextResponse.json({ error: "Run id and status are required." }, { status: 400 });

    const run = await getBreakdownRun(runId);
    if (!run) return NextResponse.json({ error: "Breakdown run not found." }, { status: 404 });
    if (!canApproveBreakdown(auth.user, run.projectId)) return NextResponse.json(forbidden(), { status: 403 });

    const updated = await updateBreakdownRunStatus({ runId, status, userId: auth.user.id });
    return NextResponse.json({ mode: "database", run: updated ? toBreakdownRun(updated) : null });
  }

  if (action === "updateElementStatus") {
    const elementId = stringField(body.elementId);
    const status = elementStatusField(body.status);
    if (!elementId || !status) return NextResponse.json({ error: "Element id and status are required." }, { status: 400 });

    const element = await prisma.breakdownElement.findUnique({ where: { id: elementId }, select: { projectId: true } });
    if (!element) return NextResponse.json({ error: "Breakdown element not found." }, { status: 404 });
    if (!canApproveBreakdown(auth.user, element.projectId)) return NextResponse.json(forbidden(), { status: 403 });

    const updated = await updateBreakdownElementStatus({ elementId, status });
    return NextResponse.json({ mode: "database", run: updated ? toBreakdownRun(updated) : null });
  }

  return NextResponse.json({ error: "Unsupported breakdown action." }, { status: 400 });
}

async function accessForDocumentVersion(user: AuthenticatedUser, documentVersionId: string) {
  const version = await prisma.documentVersion.findUnique({
    where: { id: documentVersionId },
    select: { document: { select: { projectId: true, deletedAt: true } } }
  });
  if (!version || version.document.deletedAt) return { allowed: false, notFound: true, projectId: undefined };
  const projectId = version.document.projectId;
  if (!projectId) return { allowed: canViewEverything(user.appRole), projectId };
  return { allowed: canViewEverything(user.appRole) || Boolean(user.projectRoles[projectId]), projectId };
}

function canRunBreakdown(user: AuthenticatedUser, projectId?: string | null) {
  if (user.appRole === "admin" || user.appRole === "producer") return true;
  if (!projectId) return false;
  const projectRole = user.projectRoles[projectId];
  return projectRole === "owner" || projectRole === "producer";
}

function canApproveBreakdown(user: AuthenticatedUser, projectId?: string | null) {
  if (user.appRole === "admin" || user.appRole === "producer") return true;
  if (!projectId) return false;
  const projectRole = user.projectRoles[projectId];
  return projectRole === "owner" || projectRole === "producer";
}

function canViewEverything(role: string) {
  return ["admin", "producer", "executive", "exec"].includes(role.toLowerCase());
}

function toBreakdownRun(run: ProductionBreakdownRunRecord) {
  return {
    id: run.id,
    projectId: run.projectId,
    documentId: run.documentId ?? undefined,
    documentVersionId: run.documentVersionId,
    parserName: run.parserName,
    parserVersion: run.parserVersion ?? undefined,
    status: run.status,
    summary: normalizeJsonObject(run.summaryJson),
    stats: normalizeJsonObject(run.statsJson),
    warning: run.warning ?? undefined,
    error: run.error ?? undefined,
    createdById: run.createdById ?? undefined,
    createdByName: run.createdBy?.name ?? undefined,
    approvedById: run.approvedById ?? undefined,
    approvedByName: run.approvedBy?.name ?? undefined,
    createdAt: dateTimeString(run.createdAt),
    updatedAt: dateTimeString(run.updatedAt),
    completedAt: run.completedAt ? dateTimeString(run.completedAt) : undefined,
    approvedAt: run.approvedAt ? dateTimeString(run.approvedAt) : undefined,
    elements: run.elements.map((element) => ({
      id: element.id,
      runId: element.runId,
      projectId: element.projectId,
      documentVersionId: element.documentVersionId,
      stableKey: element.stableKey,
      category: element.category,
      displayName: element.displayName,
      normalizedName: element.normalizedName,
      description: element.description ?? undefined,
      evidenceText: element.evidenceText ?? undefined,
      sourceText: element.sourceText ?? undefined,
      firstPageNumber: element.firstPageNumber ?? undefined,
      lastPageNumber: element.lastPageNumber ?? undefined,
      pageSource: element.pageSource,
      confidence: element.confidence ?? undefined,
      status: element.status,
      sortOrder: element.sortOrder,
      metadata: normalizeJsonObject(element.metadataJson),
      tags: element.tags.map((item) => ({
        id: item.tag.id,
        key: item.tag.key,
        value: item.tag.value,
        label: item.tag.label ?? undefined,
        color: item.tag.color ?? undefined
      })),
      scenes: element.sceneElements.map((scene) => ({
        id: scene.id,
        sceneNumber: scene.sceneNumber ?? undefined,
        sceneHeading: scene.sceneHeading ?? undefined,
        occurrenceCount: scene.occurrenceCount,
        firstPageNumber: scene.firstPageNumber ?? undefined,
        lastPageNumber: scene.lastPageNumber ?? undefined,
        evidenceText: scene.evidenceText ?? undefined,
        notes: scene.notes ?? undefined,
        metadata: normalizeJsonObject(scene.metadataJson)
      }))
    }))
  };
}

function normalizeJsonObject(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function runStatusField(value: unknown): BreakdownRunStatus | null {
  const status = stringField(value);
  return ["DRAFT", "RUNNING", "READY_FOR_REVIEW", "NEEDS_REVISION", "APPROVED", "ARCHIVED", "FAILED"].includes(status) ? status as BreakdownRunStatus : null;
}

function elementStatusField(value: unknown): BreakdownElementStatus | null {
  const status = stringField(value);
  return ["UNREVIEWED", "ACCEPTED", "IGNORED", "MERGED", "NEEDS_REVIEW"].includes(status) ? status as BreakdownElementStatus : null;
}

function dateTimeString(date: Date) {
  return date.toISOString();
}
