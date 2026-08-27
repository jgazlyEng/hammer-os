import { NextResponse } from "next/server";
import { isDatabaseConfigured, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      mode: "demo",
      summary: { total: 0, failed: 0, warning: 0, parsing: 0, complete: 0, stored: 0, received: 0 },
      jobs: []
    });
  }

  try {
    const [jobs, grouped] = await Promise.all([
      prisma.uploadJob.findMany({
        orderBy: { updatedAt: "desc" },
        take: 80,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, title: true } },
          document: { select: { id: true, title: true } },
          documentVersion: { select: { id: true, versionNumber: true, extractedText: true } }
        }
      }),
      prisma.uploadJob.groupBy({
        by: ["status"],
        _count: { _all: true }
      })
    ]);

    const summary = grouped.reduce((accumulator, item) => {
      const key = item.status.toLowerCase() as keyof typeof accumulator;
      accumulator[key] = item._count._all;
      accumulator.total += item._count._all;
      return accumulator;
    }, { total: 0, failed: 0, warning: 0, parsing: 0, complete: 0, stored: 0, received: 0 });

    return NextResponse.json({
      mode: "database",
      summary,
      jobs: jobs.map((job) => ({
        id: job.id,
        requestId: job.requestId,
        status: job.status,
        stage: job.stage,
        fileName: job.fileName,
        fileType: job.fileType,
        fileSize: job.fileSize,
        storagePath: job.storagePath,
        warning: job.warning,
        error: job.error,
        detailJson: job.detailJson,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        completedAt: job.completedAt?.toISOString() ?? null,
        createdBy: job.createdBy,
        project: job.project,
        document: job.document,
        documentVersion: job.documentVersion ? {
          id: job.documentVersion.id,
          versionNumber: job.documentVersion.versionNumber,
          hasExtractedText: Boolean(job.documentVersion.extractedText?.trim())
        } : null,
        href: job.documentId ? `/scripts/${job.documentId}` : job.projectId ? `/projects/${job.projectId}/documents` : undefined
      }))
    });
  } catch (error) {
    return NextResponse.json({
      mode: "database",
      error: error instanceof Error ? error.message : "Upload troubleshooting failed.",
      summary: { total: 0, failed: 0, warning: 0, parsing: 0, complete: 0, stored: 0, received: 0 },
      jobs: []
    }, { status: 503 });
  }
}
