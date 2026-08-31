import { NextResponse } from "next/server";
import { isDatabaseConfigured, requireAdmin, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WATERMARK_KEY = "download.watermark";
const UPLOAD_POLICY_KEY = "upload.policy";

const defaultWatermarkSettings = {
  defaultEnabled: true,
  mode: "USER_AND_IP",
  customText: ""
};

const defaultUploadPolicySettings = {
  maxUploadMb: 250,
  allowedExtensions: [".pdf", ".fdx", ".txt", ".md"],
  allowDocx: false,
  parseOnUpload: true,
  warnOnEmptyText: true
};

export async function GET(request: Request) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ mode: "demo", settings: { watermark: defaultWatermarkSettings, uploadPolicy: defaultUploadPolicySettings } });
  }

  const [watermark, uploadPolicy] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: WATERMARK_KEY } }),
    prisma.appSetting.findUnique({ where: { key: UPLOAD_POLICY_KEY } })
  ]);
  return NextResponse.json({
    mode: "database",
    settings: {
      watermark: normalizeWatermarkSettings(watermark?.valueJson),
      uploadPolicy: normalizeUploadPolicySettings(uploadPolicy?.valueJson)
    },
    updatedAt: maxDateString(watermark?.updatedAt, uploadPolicy?.updatedAt),
    updatedBy: watermark?.updatedBy ?? uploadPolicy?.updatedBy ?? null
  });
}

export async function PATCH(request: Request) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Settings require DATABASE_URL." }, { status: 503 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const watermark = normalizeWatermarkSettings(body.watermark);
  const uploadPolicy = normalizeUploadPolicySettings(body.uploadPolicy);
  const [savedWatermark, savedUploadPolicy] = await Promise.all([
    prisma.appSetting.upsert({
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
    }),
    prisma.appSetting.upsert({
      where: { key: UPLOAD_POLICY_KEY },
      create: {
        key: UPLOAD_POLICY_KEY,
        valueJson: uploadPolicy,
        updatedById: auth.user.id,
        updatedBy: auth.user.email
      },
      update: {
        valueJson: uploadPolicy,
        updatedById: auth.user.id,
        updatedBy: auth.user.email
      }
    })
  ]);

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
  await prisma.auditLog.create({
    data: {
      actorUserId: auth.user.id,
      actor: auth.user.email,
      action: "settings.upload_policy_updated",
      entityType: "AppSetting",
      entityId: UPLOAD_POLICY_KEY,
      detailJson: uploadPolicy
    }
  }).catch(() => undefined);

  return NextResponse.json({
    settings: { watermark, uploadPolicy },
    updatedAt: maxDateString(savedWatermark.updatedAt, savedUploadPolicy.updatedAt),
    updatedBy: savedWatermark.updatedBy ?? savedUploadPolicy.updatedBy
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

function normalizeUploadPolicySettings(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const extensions = Array.isArray(record.allowedExtensions)
    ? record.allowedExtensions.filter((item): item is string => typeof item === "string").map(normalizeExtension).filter(Boolean)
    : typeof record.allowedExtensions === "string"
      ? record.allowedExtensions.split(/[,\s]+/).map(normalizeExtension).filter(Boolean)
      : defaultUploadPolicySettings.allowedExtensions;
  return {
    maxUploadMb: clampNumber(record.maxUploadMb, 1, 500, defaultUploadPolicySettings.maxUploadMb),
    allowedExtensions: Array.from(new Set(extensions.length ? extensions : defaultUploadPolicySettings.allowedExtensions)),
    allowDocx: typeof record.allowDocx === "boolean" ? record.allowDocx : defaultUploadPolicySettings.allowDocx,
    parseOnUpload: typeof record.parseOnUpload === "boolean" ? record.parseOnUpload : defaultUploadPolicySettings.parseOnUpload,
    warnOnEmptyText: typeof record.warnOnEmptyText === "boolean" ? record.warnOnEmptyText : defaultUploadPolicySettings.warnOnEmptyText
  };
}

function normalizeExtension(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  return normalized.startsWith(".") ? normalized : `.${normalized}`;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function maxDateString(...dates: Array<Date | undefined>) {
  const timestamps = dates.filter((date): date is Date => Boolean(date)).map((date) => date.getTime());
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;
}
