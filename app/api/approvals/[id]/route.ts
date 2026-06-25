import { NextResponse } from "next/server";
import { forbidden, isDatabaseConfigured, requireUser, userCanApprove } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Approval decisions require DATABASE_URL." }, { status: 503 });
  }

  const body = await request.json();
  const state = approvalState(body.state);
  if (!state) {
    return NextResponse.json({ error: "Valid state is required." }, { status: 400 });
  }

  try {
    const existing = await prisma.approval.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Approval not found." }, { status: 404 });
    if (!userCanApprove(auth.user, existing.projectId)) return NextResponse.json(forbidden(), { status: 403 });

    const approval = await prisma.approval.update({
      where: { id: params.id },
      data: {
        state,
        decisionNote: optionalString(body.decisionNote),
        decidedAt: new Date(),
        decidedByUserId: auth.user.id
      },
      include: {
        sequence: true,
        department: true,
        decidedBy: { select: { id: true, name: true, email: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        projectId: approval.projectId,
        actorUserId: auth.user.id,
        actor: auth.user.email,
        action: "approval.updated",
        entityType: "Approval",
        entityId: approval.id,
        detailJson: { state, decisionNote: optionalString(body.decisionNote) }
      }
    });

    return NextResponse.json({ approval });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

function approvalState(value: unknown) {
  return value === "approved" || value === "pending" || value === "needs_review" || value === "blocked" ? value : null;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
