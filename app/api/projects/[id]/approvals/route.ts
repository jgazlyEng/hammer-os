import { NextResponse } from "next/server";
import { forbidden, isDatabaseConfigured, requireUser, userCanAccessProject, userCanManageProject } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!userCanAccessProject(auth.user, params.id)) return NextResponse.json(forbidden(), { status: 403 });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ approvals: [], mode: "demo" });
  }

  try {
    const approvals = await prisma.approval.findMany({
      where: { projectId: params.id },
      orderBy: [{ state: "desc" }, { due: "asc" }],
      include: {
        sequence: true,
        department: true,
        decidedBy: { select: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json({ approvals });
  } catch {
    return NextResponse.json({ approvals: [], mode: "database-unavailable" });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!userCanManageProject(auth.user, params.id)) return NextResponse.json(forbidden(), { status: 403 });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Approval creation requires DATABASE_URL." }, { status: 503 });
  }

  const body = await request.json();
  try {
    const approval = await prisma.approval.create({
      data: {
        projectId: params.id,
        sequenceId: optionalString(body.sequenceId),
        departmentId: optionalString(body.departmentId),
        owner: optionalString(body.owner),
        assignedRole: optionalProjectRole(body.assignedRole),
        due: optionalDate(body.due),
        state: "pending"
      },
      include: {
        sequence: true,
        department: true,
        decidedBy: { select: { id: true, name: true, email: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        projectId: params.id,
        actorUserId: auth.user.id,
        actor: auth.user.email,
        action: "approval.created",
        entityType: "Approval",
        entityId: approval.id,
        detailJson: body
      }
    });

    return NextResponse.json({ approval }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function optionalProjectRole(value: unknown) {
  return value === "owner" || value === "executive" || value === "producer" || value === "department_lead" || value === "viewer" ? value : undefined;
}
