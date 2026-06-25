import { NextResponse } from "next/server";
import { isDatabaseConfigured, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Project memberships require DATABASE_URL." }, { status: 503 });
  }

  try {
    const membership = await prisma.projectMembership.delete({
      where: { id: params.id },
      include: { project: { select: { id: true } } }
    });

    await prisma.auditLog.create({
      data: {
        projectId: membership.projectId,
        actorUserId: auth.user.id,
        actor: auth.user.email,
        action: "admin.membership.deleted",
        entityType: "ProjectMembership",
        entityId: params.id,
        detailJson: { userId: membership.userId }
      }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}
