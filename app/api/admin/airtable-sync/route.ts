import { NextResponse } from "next/server";
import { airtableSyncConfig, syncAirtableProspects } from "@/lib/airtable-sync";
import { isDatabaseConfigured, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const config = airtableSyncConfig();
  return NextResponse.json({
    configured: Boolean(config.apiKey),
    baseId: config.baseId,
    tables: config.tables,
    schedulerSecretConfigured: Boolean(config.secret)
  });
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database mode is not configured." }, { status: 503 });

  const config = airtableSyncConfig();
  if (!hasValidSchedulerSecret(request, config.secret)) {
    const auth = requireAdmin(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const summary = await syncAirtableProspects(prisma);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Airtable sync failed." }, { status: 500 });
  }
}

function hasValidSchedulerSecret(request: Request, secret: string) {
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}
