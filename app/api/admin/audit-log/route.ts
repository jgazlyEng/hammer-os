import { NextResponse } from "next/server";
import { isDatabaseConfigured, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ mode: "demo", summary: { total: 0, downloads: 0, access: 0, uploads: 0 }, events: [] });
  }

  try {
    const events = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        actor: true,
        actorUserId: true,
        action: true,
        entityType: true,
        entityId: true,
        projectId: true,
        detailJson: true,
        createdAt: true,
        project: { select: { id: true, title: true } }
      }
    });
    const total = await prisma.auditLog.count();
    const downloads = await prisma.auditLog.count({ where: { action: { startsWith: "file.downloaded" } } });
    const access = await prisma.auditLog.count({ where: { action: { in: ["user.role_changed", "user.project_access_updated", "user.project_access_removed", "user.created", "user.deleted"] } } });
    const uploads = await prisma.auditLog.count({ where: { action: { contains: "uploaded" } } });
    return NextResponse.json({
      mode: "database",
      summary: { total, downloads, access, uploads },
      events: events.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() }))
    });
  } catch (error) {
    return NextResponse.json({ mode: "database", error: error instanceof Error ? error.message : "Audit log failed.", summary: { total: 0, downloads: 0, access: 0, uploads: 0 }, events: [] }, { status: 503 });
  }
}
