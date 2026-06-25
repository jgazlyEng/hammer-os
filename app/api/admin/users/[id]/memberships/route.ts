import { NextResponse } from "next/server";
import type { ProjectRole } from "@prisma/client";
import { isDatabaseConfigured, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Project memberships require DATABASE_URL." }, { status: 503 });
  }

  const body = await request.json();
  const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
  const role = projectRoleField(body.role);

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  try {
    const membership = await prisma.projectMembership.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: params.id
        }
      },
      create: {
        projectId,
        userId: params.id,
        role
      },
      update: { role },
      include: {
        project: { select: { id: true, title: true, stage: true } },
        user: { select: { id: true, email: true, name: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        projectId,
        actorUserId: auth.user.id,
        actor: auth.user.email,
        action: "admin.membership.upserted",
        entityType: "ProjectMembership",
        entityId: membership.id,
        detailJson: { userId: params.id, role }
      }
    });

    return NextResponse.json({ membership });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

function projectRoleField(value: unknown): ProjectRole {
  return value === "owner" || value === "executive" || value === "producer" || value === "department_lead" || value === "viewer" ? value : "viewer";
}
