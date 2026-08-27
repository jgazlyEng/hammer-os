import { NextResponse } from "next/server";
import { isDatabaseConfigured, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StorageInventoryItem = {
  id: string;
  kind: "Script Version" | "Supporting Doc" | "Prospect File" | "Project Asset" | "Legacy Script File";
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  storageMode: "GCS" | "Database" | "Local" | "Missing";
  href?: string;
  updatedAt?: string;
  createdAt?: string;
};

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      mode: "demo",
      summary: emptySummary(),
      items: []
    });
  }

  try {
    const [versions, supportingDocuments, prospectAssets, assets, legacyScriptFiles] = await Promise.all([
      prisma.documentVersion.findMany({
        orderBy: { createdAt: "desc" },
        take: 80,
        include: { document: { select: { id: true, title: true, deletedAt: true } } }
      }),
      prisma.supportingDocument.findMany({
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 40
      }),
      prisma.prospectAsset.findMany({
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 40
      }),
      prisma.asset.findMany({
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 40
      }),
      prisma.scriptFile.findMany({
        orderBy: { createdAt: "desc" },
        take: 40
      })
    ]);

    const items: StorageInventoryItem[] = [
      ...versions
        .filter((version) => !version.document.deletedAt)
        .map((version) => ({
          id: version.id,
          kind: "Script Version" as const,
          title: `${version.document.title} v${version.versionNumber}`,
          fileName: version.fileName,
          fileType: version.fileType,
          fileSize: version.fileSize,
          storagePath: version.storagePath,
          storageMode: storageMode(version.storagePath, version.dataUrl),
          href: `/scripts/${version.documentId}`,
          createdAt: version.createdAt.toISOString()
        })),
      ...supportingDocuments.map((document) => ({
        id: document.id,
        kind: "Supporting Doc" as const,
        title: document.title,
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        storagePath: document.storagePath,
        storageMode: storageMode(document.storagePath, document.dataUrl),
        href: `/scripts/${document.scriptDocumentId}`,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString()
      })),
      ...prospectAssets.map((asset) => ({
        id: asset.id,
        kind: "Prospect File" as const,
        title: asset.title,
        fileName: asset.fileName,
        fileType: asset.fileType,
        fileSize: asset.fileSize,
        storagePath: asset.storagePath,
        storageMode: storageMode(asset.storagePath, asset.dataUrl),
        href: `/prospects?prospect=${asset.prospectId}`,
        createdAt: asset.createdAt.toISOString(),
        updatedAt: asset.updatedAt.toISOString()
      })),
      ...assets.map((asset) => ({
        id: asset.id,
        kind: "Project Asset" as const,
        title: asset.title,
        fileName: asset.fileName,
        fileType: asset.fileType,
        fileSize: asset.fileSize,
        storagePath: asset.storagePath,
        storageMode: storageMode(asset.storagePath, asset.dataUrl),
        href: `/assets/${asset.id}`,
        createdAt: asset.createdAt.toISOString(),
        updatedAt: asset.updatedAt.toISOString()
      })),
      ...legacyScriptFiles.map((file) => ({
        id: file.id,
        kind: "Legacy Script File" as const,
        title: file.fileName,
        fileName: file.fileName,
        fileType: file.mimeType,
        fileSize: file.sizeBytes,
        storagePath: file.storagePath,
        storageMode: storageMode(file.storagePath),
        href: `/projects/${file.projectId}/documents`,
        createdAt: file.createdAt.toISOString()
      }))
    ];
    items.sort((a, b) => Date.parse(b.updatedAt ?? b.createdAt ?? "") - Date.parse(a.updatedAt ?? a.createdAt ?? ""));

    const summary = items.reduce((accumulator, item) => {
      accumulator.total += 1;
      accumulator.totalSize += item.fileSize || 0;
      accumulator[item.storageMode.toLowerCase() as "gcs" | "database" | "local" | "missing"] += 1;
      return accumulator;
    }, emptySummary());

    return NextResponse.json({
      mode: "database",
      summary,
      items: items.slice(0, 120)
    });
  } catch (error) {
    return NextResponse.json({
      mode: "database",
      error: error instanceof Error ? error.message : "Storage inventory failed.",
      summary: emptySummary(),
      items: []
    }, { status: 503 });
  }
}

function emptySummary() {
  return { total: 0, totalSize: 0, gcs: 0, database: 0, local: 0, missing: 0 };
}

function storageMode(storagePath?: string | null, dataUrl?: string | null): StorageInventoryItem["storageMode"] {
  if (storagePath?.startsWith("gs://")) return "GCS";
  if (storagePath?.startsWith("local://") || storagePath?.startsWith("/")) return "Local";
  if (dataUrl?.startsWith("data:")) return "Database";
  return "Missing";
}
