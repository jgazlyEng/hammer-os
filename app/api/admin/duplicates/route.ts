import { NextResponse } from "next/server";
import { isDatabaseConfigured, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DuplicateItem = {
  id: string;
  title: string;
  detail?: string | null;
  href: string;
  updatedAt: string;
};

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ mode: "demo", summary: { groups: 0, records: 0 }, groups: [] });
  }

  try {
    const [projects, prospects, contacts] = await Promise.all([
      prisma.project.findMany({ where: { deletedAt: null }, select: { id: true, title: true, genre: true, updatedAt: true } }),
      prisma.prospect.findMany({ where: { deletedAt: null }, select: { id: true, title: true, creator: true, externalId: true, updatedAt: true } }),
      prisma.contact.findMany({ where: { deletedAt: null }, select: { id: true, name: true, email: true, company: true, updatedAt: true } })
    ]);

    const groups = [
      ...duplicateGroups("Development Slate", projects, (project) => normalizeKey(project.title), (project) => ({
        id: project.id,
        title: project.title,
        detail: project.genre,
        href: `/projects/${project.id}`,
        updatedAt: project.updatedAt.toISOString()
      })),
      ...duplicateGroups("Prospects", prospects, (prospect) => normalizeKey(`${prospect.title}:${prospect.creator ?? ""}:${prospect.externalId ?? ""}`), (prospect) => ({
        id: prospect.id,
        title: prospect.title,
        detail: prospect.creator || prospect.externalId,
        href: `/prospects?prospect=${prospect.id}`,
        updatedAt: prospect.updatedAt.toISOString()
      })),
      ...duplicateGroups("Outreach", contacts, (contact) => normalizeKey(contact.email || `${contact.name}:${contact.company ?? ""}`), (contact) => ({
        id: contact.id,
        title: contact.name,
        detail: contact.email || contact.company,
        href: `/outreach?contact=${contact.id}`,
        updatedAt: contact.updatedAt.toISOString()
      }))
    ].filter((group) => group.items.length > 1).slice(0, 40);

    return NextResponse.json({
      mode: "database",
      summary: { groups: groups.length, records: groups.reduce((sum, group) => sum + group.items.length, 0) },
      groups
    });
  } catch (error) {
    return NextResponse.json({ mode: "database", error: error instanceof Error ? error.message : "Duplicate review failed.", summary: { groups: 0, records: 0 }, groups: [] }, { status: 503 });
  }
}

function duplicateGroups<T>(type: string, records: T[], keyFor: (record: T) => string, itemFor: (record: T) => DuplicateItem) {
  const byKey = new Map<string, DuplicateItem[]>();
  for (const record of records) {
    const key = keyFor(record);
    if (!key) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), itemFor(record)]);
  }
  return Array.from(byKey.entries()).map(([key, items]) => ({ key, type, items }));
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
