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
      database: { connected: false },
      storage: storageConfigStatus(),
      deployment: deploymentReadiness(false),
      counts: { users: 0, projects: 0, documents: 0, tasks: 0 },
      uploadJobs: { failed: 0, warning: 0, parsing: 0, recent: [] }
    });
  }

  try {
    const [users, projects, documents, tasks, failedUploads, warningUploads, parsingUploads, recentUploads] = await Promise.all([
      prisma.user.count(),
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.document.count({ where: { deletedAt: null } }),
      prisma.task.count({ where: { deletedAt: null } }),
      prisma.uploadJob.count({ where: { status: "FAILED" } }),
      prisma.uploadJob.count({ where: { status: "WARNING" } }),
      prisma.uploadJob.count({ where: { status: "PARSING" } }),
      prisma.uploadJob.findMany({
        where: { status: { in: ["FAILED", "WARNING", "PARSING"] } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          status: true,
          stage: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          storagePath: true,
          warning: true,
          error: true,
          createdAt: true
        }
      })
    ]);

    return NextResponse.json({
      mode: "database",
      database: { connected: true },
      storage: storageConfigStatus(),
      deployment: deploymentReadiness(true),
      counts: { users, projects, documents, tasks },
      uploadJobs: {
        failed: failedUploads,
        warning: warningUploads,
        parsing: parsingUploads,
        recent: recentUploads.map((job) => ({
          ...job,
          createdAt: job.createdAt.toISOString()
        }))
      }
    });
  } catch (error) {
    return NextResponse.json({
      mode: "database",
      database: { connected: false, error: error instanceof Error ? error.message : "Database health check failed." },
      storage: storageConfigStatus(),
      deployment: deploymentReadiness(false),
      counts: { users: 0, projects: 0, documents: 0, tasks: 0 },
      uploadJobs: { failed: 0, warning: 0, parsing: 0, recent: [] }
    }, { status: 503 });
  }
}

function storageConfigStatus() {
  const required = ["GCS_BUCKET_NAME", "GCS_PROJECT_ID", "GCS_CLIENT_EMAIL", "GCS_PRIVATE_KEY"];
  const missing = required.filter((key) => !process.env[key]);
  return {
    configured: missing.length === 0,
    bucketConfigured: Boolean(process.env.GCS_BUCKET_NAME),
    missing
  };
}

function deploymentReadiness(databaseConnected: boolean) {
  const checks = [
    readinessCheck("Database", "DATABASE_URL", databaseConnected && Boolean(process.env.DATABASE_URL), "Required for production data."),
    readinessCheck("Session Secret", "SESSION_SECRET", Boolean(process.env.SESSION_SECRET), "Required for secure login sessions."),
    readinessCheck("App URL", "NEXTAUTH_URL", Boolean(process.env.NEXTAUTH_URL), "Should match the production URL."),
    readinessCheck("Google Client ID", "GOOGLE_CLIENT_ID", Boolean(process.env.GOOGLE_CLIENT_ID), "Required for Google sign-in."),
    readinessCheck("Google Client Secret", "GOOGLE_CLIENT_SECRET", Boolean(process.env.GOOGLE_CLIENT_SECRET), "Required for Google sign-in."),
    readinessCheck("Google Callback URL", "GOOGLE_CALLBACK_URL", Boolean(process.env.GOOGLE_CALLBACK_URL), "Must match Google Cloud OAuth settings."),
    readinessCheck("GCS Bucket", "GCS_BUCKET_NAME", Boolean(process.env.GCS_BUCKET_NAME || process.env.GCS_UPLOAD_BUCKET), "Required for production file storage."),
    readinessCheck("GCS Project", "GCS_PROJECT_ID", Boolean(process.env.GCS_PROJECT_ID), "Required for service-account backed GCS access."),
    readinessCheck("GCS Client Email", "GCS_CLIENT_EMAIL", Boolean(process.env.GCS_CLIENT_EMAIL), "Required for service-account backed GCS access."),
    readinessCheck("GCS Private Key", "GCS_PRIVATE_KEY", Boolean(process.env.GCS_PRIVATE_KEY), "Required for service-account backed GCS access."),
    readinessCheck("Allowed Google Users", "GOOGLE_ALLOWED_DOMAINS or GOOGLE_ALLOWED_EMAILS", Boolean(process.env.GOOGLE_ALLOWED_DOMAINS || process.env.GOOGLE_ALLOWED_EMAILS), "Recommended so outside Google accounts cannot self-register.")
  ];
  const blocking = checks.filter((check) => !check.configured && check.required).length;
  const warnings = checks.filter((check) => !check.configured && !check.required).length;
  return {
    ready: blocking === 0,
    blocking,
    warnings,
    checks
  };
}

function readinessCheck(label: string, key: string, configured: boolean, description: string) {
  return {
    label,
    key,
    configured,
    required: key !== "GOOGLE_ALLOWED_DOMAINS or GOOGLE_ALLOWED_EMAILS",
    description
  };
}
