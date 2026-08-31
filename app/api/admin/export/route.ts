import { NextResponse } from "next/server";
import { isDatabaseConfigured, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportType = "users" | "development-slate" | "prospects" | "outreach" | "tasks" | "documents" | "collections" | "file-inventory";

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Exports require database mode." }, { status: 503 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type") as ExportType | null;
  if (!type || !exportTypes.includes(type)) return NextResponse.json({ error: "Choose a valid export type." }, { status: 400 });

  const rows = await exportRows(type);
  await prisma.auditLog.create({
    data: {
      actorUserId: auth.user.id,
      actor: auth.user.email,
      action: "admin.export_downloaded",
      entityType: "AdminExport",
      entityId: type,
      detailJson: { type, rows: rows.length }
    }
  }).catch(() => undefined);

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="greenlight-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store"
    }
  });
}

const exportTypes: ExportType[] = ["users", "development-slate", "prospects", "outreach", "tasks", "documents", "collections", "file-inventory"];

async function exportRows(type: ExportType) {
  if (type === "users") {
    const users = await prisma.user.findMany({ orderBy: { name: "asc" }, include: { memberships: { include: { project: { select: { title: true } } } } } });
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      appRole: user.appRole,
      projects: user.memberships.map((membership) => `${membership.project?.title ?? membership.projectId}:${membership.role}`).join("; "),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    }));
  }
  if (type === "development-slate") {
    const projects = await prisma.project.findMany({ where: { deletedAt: null }, orderBy: { title: "asc" }, include: { owner: { select: { name: true, email: true } } } });
    return projects.map((project) => ({
      id: project.id,
      title: project.title,
      logline: project.logline,
      type: project.type,
      genre: project.genre,
      status: project.status,
      stage: project.hammerStage,
      owner: project.owner?.name ?? project.owner?.email ?? "",
      updatedAt: project.updatedAt.toISOString()
    }));
  }
  if (type === "prospects") {
    const prospects = await prisma.prospect.findMany({ where: { deletedAt: null }, orderBy: { title: "asc" } });
    return prospects.map((prospect) => ({
      id: prospect.id,
      title: prospect.title,
      creator: prospect.creator,
      logline: prospect.logline,
      genre: prospect.genre,
      urgency: prospect.urgencyLabel,
      source: prospect.platformSource,
      rights: prospect.rightsStatus,
      nextAction: prospect.nextActionStatus,
      owners: prospect.ownerIds.join("; "),
      updatedAt: prospect.updatedAt.toISOString()
    }));
  }
  if (type === "outreach") {
    const contacts = await prisma.contact.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
    return contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      company: contact.company,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      location: contact.location,
      status: contact.status,
      nextFollowUp: contact.nextFollowUp?.toISOString() ?? "",
      lastContacted: contact.lastContacted?.toISOString() ?? "",
      notes: contact.notes
    }));
  }
  if (type === "tasks") {
    const tasks = await prisma.task.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, include: { assignedTo: { select: { name: true, email: true } }, project: { select: { title: true } } } });
    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      project: task.project?.title ?? "",
      assignee: task.assignedTo?.name ?? task.assignedTo?.email ?? "",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate?.toISOString() ?? "",
      createdAt: task.createdAt.toISOString()
    }));
  }
  if (type === "documents") {
    const documents = await prisma.document.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, include: { project: { select: { title: true } }, currentVersion: true } });
    return documents.map((document) => ({
      id: document.id,
      title: document.title,
      project: document.project?.title ?? "",
      type: document.type,
      writer: document.writerName,
      source: document.source,
      currentVersion: document.currentVersion?.versionNumber ?? "",
      status: document.currentVersion?.status ?? "",
      fileName: document.currentVersion?.fileName ?? "",
      updatedAt: document.updatedAt.toISOString()
    }));
  }
  if (type === "collections") {
    const [slateCollections, scriptCollections] = await Promise.all([
      prisma.slateCollection.findMany({ include: { items: true, owner: { select: { name: true, email: true } } }, orderBy: { updatedAt: "desc" } }),
      prisma.scriptCollection.findMany({ include: { items: true, owner: { select: { name: true, email: true } } }, orderBy: { updatedAt: "desc" } })
    ]);
    return [
      ...slateCollections.map((collection) => ({ id: collection.id, type: "Slate Packet", name: collection.name, status: collection.status, owner: collection.owner?.name ?? collection.owner?.email ?? "", items: collection.items.length, updatedAt: collection.updatedAt.toISOString() })),
      ...scriptCollections.map((collection) => ({ id: collection.id, type: "Document Packet", name: collection.name, status: collection.status, owner: collection.owner?.name ?? collection.owner?.email ?? "", items: collection.items.length, updatedAt: collection.updatedAt.toISOString() }))
    ];
  }
  const [versions, supporting, prospectAssets, assets] = await Promise.all([
    prisma.documentVersion.findMany({ include: { document: { select: { title: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.supportingDocument.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.prospectAsset.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.asset.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } })
  ]);
  return [
    ...versions.map((item) => ({ id: item.id, type: "Script Version", title: item.document.title, fileName: item.fileName, fileType: item.fileType, fileSize: item.fileSize, storagePath: item.storagePath, createdAt: item.createdAt.toISOString() })),
    ...supporting.map((item) => ({ id: item.id, type: "Supporting Doc", title: item.title, fileName: item.fileName, fileType: item.fileType, fileSize: item.fileSize, storagePath: item.storagePath, createdAt: item.createdAt.toISOString() })),
    ...prospectAssets.map((item) => ({ id: item.id, type: "Prospect File", title: item.title, fileName: item.fileName, fileType: item.fileType, fileSize: item.fileSize, storagePath: item.storagePath, createdAt: item.createdAt.toISOString() })),
    ...assets.map((item) => ({ id: item.id, type: "Project Asset", title: item.title, fileName: item.fileName, fileType: item.fileType, fileSize: item.fileSize, storagePath: item.storagePath, createdAt: item.createdAt.toISOString() }))
  ];
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));
  return [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))].map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
