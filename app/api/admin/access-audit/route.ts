import { NextResponse } from "next/server";
import { isDatabaseConfigured, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ mode: "demo", users: [], projects: [], summary: { users: 0, fullAccessUsers: 0, assignedUsers: 0, unassignedUsers: 0 } });
  }

  try {
    const [users, projects, documents, slateCollections, scriptCollections] = await Promise.all([
      prisma.user.findMany({ orderBy: { name: "asc" }, include: { memberships: { include: { project: { select: { id: true, title: true, status: true } } } } } }),
      prisma.project.findMany({ where: { deletedAt: null }, orderBy: { title: "asc" }, include: { memberships: { include: { user: { select: { id: true, name: true, email: true, appRole: true } } } }, documents: { where: { deletedAt: null }, select: { id: true, title: true, type: true } } } }),
      prisma.document.findMany({ where: { deletedAt: null }, select: { id: true, title: true, type: true, projectId: true } }),
      prisma.slateCollection.findMany({ where: { status: { not: "ARCHIVED" } }, include: { items: true, owner: { select: { id: true, name: true, email: true } } } }),
      prisma.scriptCollection.findMany({ where: { status: { not: "ARCHIVED" } }, include: { items: true, owner: { select: { id: true, name: true, email: true } } } })
    ]);

    const fullAccessUsers = users.filter((user) => canSeeEverything(user.appRole));
    return NextResponse.json({
      mode: "database",
      summary: {
        users: users.length,
        fullAccessUsers: fullAccessUsers.length,
        assignedUsers: users.filter((user) => !canSeeEverything(user.appRole) && user.memberships.length).length,
        unassignedUsers: users.filter((user) => !canSeeEverything(user.appRole) && !user.memberships.length).length
      },
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        appRole: user.appRole,
        fullAccess: canSeeEverything(user.appRole),
        projects: canSeeEverything(user.appRole)
          ? projects.map((project) => ({ id: project.id, title: project.title, role: "full_access" }))
          : user.memberships.map((membership) => ({ id: membership.projectId, title: membership.project.title, role: membership.role })),
        documents: canSeeEverything(user.appRole)
          ? documents.length
          : documents.filter((document) => document.projectId && user.memberships.some((membership) => membership.projectId === document.projectId)).length,
        collections: canSeeEverything(user.appRole) ? slateCollections.length + scriptCollections.length : 0
      })),
      projects: projects.map((project) => ({
        id: project.id,
        title: project.title,
        status: project.status,
        members: [
          ...fullAccessUsers.map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.appRole, inherited: true })),
          ...project.memberships.map((membership) => ({ id: membership.user.id, name: membership.user.name, email: membership.user.email, role: membership.role, inherited: false }))
        ],
        documents: project.documents
      })),
      collections: [
        ...slateCollections.map((collection) => ({ id: collection.id, type: "Slate Packet", name: collection.name, owner: collection.owner?.name ?? collection.owner?.email ?? "", items: collection.items.length })),
        ...scriptCollections.map((collection) => ({ id: collection.id, type: "Document Packet", name: collection.name, owner: collection.owner?.name ?? collection.owner?.email ?? "", items: collection.items.length }))
      ]
    });
  } catch (error) {
    return NextResponse.json({ mode: "database", error: error instanceof Error ? error.message : "Access audit failed.", users: [], projects: [], summary: { users: 0, fullAccessUsers: 0, assignedUsers: 0, unassignedUsers: 0 } }, { status: 503 });
  }
}

function canSeeEverything(appRole: string) {
  return appRole === "admin" || appRole === "producer" || appRole === "executive";
}
