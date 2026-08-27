import { NextResponse } from "next/server";
import { isDatabaseConfigured, requireAdmin, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WATERMARK_KEY = "download.watermark";

const defaultWatermarkSettings = {
  defaultEnabled: true,
  mode: "USER_AND_IP",
  customText: ""
};

export async function GET(request: Request) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ mode: "demo", settings: { watermark: defaultWatermarkSettings } });
  }

  const watermark = await prisma.appSetting.findUnique({ where: { key: WATERMARK_KEY } });
  return NextResponse.json({
    mode: "database",
    settings: {
      watermark: normalizeWatermarkSettings(watermark?.valueJson)
    },
    updatedAt: watermark?.updatedAt.toISOString() ?? null,
    updatedBy: watermark?.updatedBy ?? null
  });
}

export async function PATCH(request: Request) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Settings require DATABASE_URL." }, { status: 503 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const watermark = normalizeWatermarkSettings(body.watermark);
  const saved = await prisma.appSetting.upsert({
    where: { key: WATERMARK_KEY },
    create: {
      key: WATERMARK_KEY,
      valueJson: watermark,
      updatedById: auth.user.id,
      updatedBy: auth.user.email
    },
    update: {
      valueJson: watermark,
      updatedById: auth.user.id,
      updatedBy: auth.user.email
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: auth.user.id,
      actor: auth.user.email,
      action: "settings.watermark_updated",
      entityType: "AppSetting",
      entityId: WATERMARK_KEY,
      detailJson: watermark
    }
  }).catch(() => undefined);

  return NextResponse.json({
    settings: { watermark },
    updatedAt: saved.updatedAt.toISOString(),
    updatedBy: saved.updatedBy
  });
}

function normalizeWatermarkSettings(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const mode = typeof record.mode === "string" && ["CUSTOM_TEXT", "USER_ONLY", "USER_AND_IP"].includes(record.mode) ? record.mode : defaultWatermarkSettings.mode;
  return {
    defaultEnabled: typeof record.defaultEnabled === "boolean" ? record.defaultEnabled : defaultWatermarkSettings.defaultEnabled,
    mode,
    customText: typeof record.customText === "string" ? record.customText.slice(0, 180) : ""
  };
}
