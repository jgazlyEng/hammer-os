import { NextResponse } from "next/server";
import { forbidden, isDatabaseConfigured, requireUser, userCanAccessProject, userCanManageProject } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { projects as seededProjects } from "@/lib/mock-data";
import type { RiskLevel } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(_request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!userCanAccessProject(auth.user, params.id)) return NextResponse.json(forbidden(), { status: 403 });

  if (!isDatabaseConfigured()) {
    const project = seededProjects.find((item) => item.id === params.id);
    return project ? NextResponse.json({ project, mode: "demo" }) : NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        scriptVersions: {
          orderBy: { uploadedAt: "desc" },
          take: 10
        },
        _count: {
          select: {
            sequences: true,
            scenes: true,
            risks: true,
            approvals: true,
            scriptVersions: true
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch {
    const project = seededProjects.find((item) => item.id === params.id);
    return project ? NextResponse.json({ project, mode: "database-unavailable" }) : NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!userCanManageProject(auth.user, params.id)) return NextResponse.json(forbidden(), { status: 403 });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Project updates require DATABASE_URL." }, { status: 503 });
  }

  const body = await request.json();
  try {
    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        title: optionalString(body.title)?.toUpperCase(),
        codename: optionalString(body.codename),
        stage: optionalString(body.stage),
        studioUnit: optionalString(body.studioUnit),
        currentScriptVersion: optionalString(body.currentScriptVersion),
        currentTreatmentVersion: optionalString(body.currentTreatmentVersion),
        treatmentAlignment: optionalPercent(body.treatmentAlignment),
        previzCompletion: optionalPercent(body.previzCompletion),
        changeRiskLevel: optionalRisk(body.changeRiskLevel),
        auditLogs: {
          create: {
            actorUserId: auth.user.id,
            actor: auth.user.email,
            action: "project.updated",
            entityType: "Project",
            entityId: params.id,
            detailJson: body
          }
        }
      }
    });

    return NextResponse.json({ project });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(_request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!userCanManageProject(auth.user, params.id)) return NextResponse.json(forbidden(), { status: 403 });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Project deletion requires DATABASE_URL." }, { status: 503 });
  }

  try {
    await prisma.project.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalRisk(value: unknown): RiskLevel | undefined {
  return value === "low" || value === "medium" || value === "high" || value === "critical" ? value : undefined;
}

function optionalPercent(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(parsed)) return undefined;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}
