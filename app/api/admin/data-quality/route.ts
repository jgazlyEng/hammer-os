import { NextResponse } from "next/server";
import { isDatabaseConfigured, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DataQualitySeverity = "info" | "warning" | "error";

type DataQualityItem = {
  id: string;
  title: string;
  detail: string;
  href?: string;
  createdAt?: string;
  updatedAt?: string;
};

type DataQualityCheck = {
  key: string;
  label: string;
  description: string;
  severity: DataQualitySeverity;
  total: number;
  items: DataQualityItem[];
};

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      mode: "demo",
      totalIssues: 0,
      checks: []
    });
  }

  try {
    const [
      documentsWithoutCurrentTotal,
      documentsWithoutCurrent,
      documentVersionsMissingStorageTotal,
      documentVersionsMissingStorage,
      supportingDocumentsMissingStorageTotal,
      supportingDocumentsMissingStorage,
      prospectAssetsMissingStorageTotal,
      prospectAssetsMissingStorage,
      unassignedDocumentsTotal,
      unassignedDocuments,
      unassignedTasksTotal,
      unassignedTasks,
      uploadAttentionTotal,
      uploadAttention
    ] = await Promise.all([
      prisma.document.count({ where: { deletedAt: null, currentVersionId: null } }),
      prisma.document.findMany({
        where: { deletedAt: null, currentVersionId: null },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { id: true, title: true, type: true, projectId: true, createdAt: true, updatedAt: true }
      }),
      prisma.documentVersion.count({ where: { storagePath: "" } }),
      prisma.documentVersion.findMany({
        where: { storagePath: "" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, documentId: true, versionNumber: true, fileName: true, createdAt: true }
      }),
      prisma.supportingDocument.count({ where: { deletedAt: null, storagePath: "" } }),
      prisma.supportingDocument.findMany({
        where: { deletedAt: null, storagePath: "" },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { id: true, scriptDocumentId: true, title: true, fileName: true, createdAt: true, updatedAt: true }
      }),
      prisma.prospectAsset.count({ where: { deletedAt: null, storagePath: "" } }),
      prisma.prospectAsset.findMany({
        where: { deletedAt: null, storagePath: "" },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { id: true, prospectId: true, title: true, fileName: true, createdAt: true, updatedAt: true }
      }),
      prisma.document.count({ where: { deletedAt: null, projectId: null } }),
      prisma.document.findMany({
        where: { deletedAt: null, projectId: null },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { id: true, title: true, type: true, createdAt: true, updatedAt: true }
      }),
      prisma.task.count({ where: { deletedAt: null, assignedToId: null, status: { notIn: ["DONE", "ARCHIVED"] } } }),
      prisma.task.findMany({
        where: { deletedAt: null, assignedToId: null, status: { notIn: ["DONE", "ARCHIVED"] } },
        orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
        take: 10,
        select: { id: true, title: true, priority: true, status: true, dueDate: true, createdAt: true, updatedAt: true }
      }),
      prisma.uploadJob.count({ where: { status: { in: ["FAILED", "WARNING", "PARSING"] } } }),
      prisma.uploadJob.findMany({
        where: { status: { in: ["FAILED", "WARNING", "PARSING"] } },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          stage: true,
          fileName: true,
          documentId: true,
          projectId: true,
          warning: true,
          error: true,
          createdAt: true,
          updatedAt: true
        }
      })
    ]);

    const missingFilesTotal = documentVersionsMissingStorageTotal + supportingDocumentsMissingStorageTotal + prospectAssetsMissingStorageTotal;
    const checks: DataQualityCheck[] = [
      {
        key: "documents_without_current_version",
        label: "Documents without a current version",
        description: "Scripts or documents exist, but no current file version is attached.",
        severity: documentsWithoutCurrentTotal ? "warning" : "info",
        total: documentsWithoutCurrentTotal,
        items: documentsWithoutCurrent.map((document) => ({
          id: document.id,
          title: document.title,
          detail: `${document.type}${document.projectId ? ` / Project ${document.projectId}` : " / Not assigned to a slate"}`,
          href: `/scripts/${document.id}`,
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString()
        }))
      },
      {
        key: "missing_file_paths",
        label: "Files missing storage paths",
        description: "Database records exist, but the app does not know where the file lives in storage.",
        severity: missingFilesTotal ? "error" : "info",
        total: missingFilesTotal,
        items: [
          ...documentVersionsMissingStorage.map((version) => ({
            id: version.id,
            title: version.fileName,
            detail: `Document version v${version.versionNumber}`,
            href: `/scripts/${version.documentId}`,
            createdAt: version.createdAt.toISOString()
          })),
          ...supportingDocumentsMissingStorage.map((document) => ({
            id: document.id,
            title: document.title || document.fileName,
            detail: "Supporting document",
            href: `/scripts/${document.scriptDocumentId}`,
            createdAt: document.createdAt.toISOString(),
            updatedAt: document.updatedAt.toISOString()
          })),
          ...prospectAssetsMissingStorage.map((asset) => ({
            id: asset.id,
            title: asset.title || asset.fileName,
            detail: "Prospect asset",
            href: `/prospects?prospect=${asset.prospectId}`,
            createdAt: asset.createdAt.toISOString(),
            updatedAt: asset.updatedAt.toISOString()
          }))
        ].slice(0, 10)
      },
      {
        key: "unassigned_documents",
        label: "Documents not assigned to a slate",
        description: "Incoming material can be valid, but should be reviewed so it does not get lost.",
        severity: unassignedDocumentsTotal ? "warning" : "info",
        total: unassignedDocumentsTotal,
        items: unassignedDocuments.map((document) => ({
          id: document.id,
          title: document.title,
          detail: document.type,
          href: `/scripts/${document.id}`,
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString()
        }))
      },
      {
        key: "unassigned_tasks",
        label: "Open tasks without assignees",
        description: "Tasks that are not assigned to anyone are easy to miss.",
        severity: unassignedTasksTotal ? "warning" : "info",
        total: unassignedTasksTotal,
        items: unassignedTasks.map((task) => ({
          id: task.id,
          title: task.title,
          detail: `${task.priority} / ${task.status}${task.dueDate ? ` / Due ${task.dueDate.toISOString().slice(0, 10)}` : ""}`,
          href: `/tasks?task=${task.id}`,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString()
        }))
      },
      {
        key: "upload_attention",
        label: "Uploads needing attention",
        description: "Recent upload jobs that failed, warned, or are still parsing.",
        severity: uploadAttentionTotal ? "error" : "info",
        total: uploadAttentionTotal,
        items: uploadAttention.map((job) => ({
          id: job.id,
          title: job.fileName,
          detail: `${job.status} / ${job.error || job.warning || job.stage}`,
          href: job.documentId ? `/scripts/${job.documentId}` : job.projectId ? `/projects/${job.projectId}/documents` : undefined,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString()
        }))
      }
    ];

    return NextResponse.json({
      mode: "database",
      totalIssues: checks.reduce((sum, check) => sum + check.total, 0),
      checks
    });
  } catch (error) {
    return NextResponse.json({
      mode: "database",
      error: error instanceof Error ? error.message : "Data quality check failed.",
      totalIssues: 0,
      checks: []
    }, { status: 503 });
  }
}
