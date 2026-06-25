import { NextResponse } from "next/server";
import { forbidden, isDatabaseConfigured, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { projects as seededProjects } from "@/lib/mock-data";
import type { RiskLevel } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ projects: seededProjects, mode: "demo" });
  }

  try {
    const projects = await prisma.project.findMany({
      where: user.appRole === "admin" ? undefined : { memberships: { some: { userId: user.id } } },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            scriptVersions: true,
            sequences: true,
            risks: true,
            approvals: true
          }
        }
      }
    });

    return NextResponse.json({ projects });
  } catch {
    return NextResponse.json({ projects: seededProjects, mode: "database-unavailable" });
  }
}

export async function POST(request: Request) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Project creation requires DATABASE_URL." }, { status: 503 });
  }

  if (user.appRole !== "admin" && user.appRole !== "producer") {
    return NextResponse.json(forbidden(), { status: 403 });
  }

  const body = await request.json();
  const title = stringField(body.title);

  if (!title) {
    return NextResponse.json({ error: "Project title is required." }, { status: 400 });
  }

  try {
    const project = await prisma.project.create({
      data: {
        title: title.toUpperCase(),
        codename: stringField(body.codename) || title,
        stage: stringField(body.stage) || "Development",
        studioUnit: stringField(body.studioUnit) || "Unassigned Unit",
        currentScriptVersion: stringField(body.currentScriptVersion) || "S-01 White",
        currentTreatmentVersion: stringField(body.currentTreatmentVersion) || "T-01",
        treatmentAlignment: clampPercent(body.treatmentAlignment),
        previzCompletion: clampPercent(body.previzCompletion),
        changeRiskLevel: riskField(body.changeRiskLevel),
        pendingApprovals: 0,
        memberships: {
          create: {
            userId: user.id,
            role: "owner"
          }
        },
        auditLogs: {
          create: {
            actorUserId: user.id,
            actor: user.email,
            action: "project.created",
            entityType: "Project",
            detailJson: { title }
          }
        }
      }
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function riskField(value: unknown): RiskLevel {
  return value === "low" || value === "medium" || value === "high" || value === "critical" ? value : "medium";
}

function clampPercent(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}
