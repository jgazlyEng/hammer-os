import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export const LLM_PROVIDER_KEY = "llm.provider";

export type LlmProviderName = "anthropic" | "openai" | "disabled";

export type LlmProviderSettings = {
  enabled: boolean;
  provider: LlmProviderName;
  model: string;
  maxInputCharacters: number;
  allowExternalScriptAnalysis: boolean;
  encryptedApiKey?: string;
};

export const defaultLlmProviderSettings: LlmProviderSettings = {
  enabled: false,
  provider: (process.env.GREENLIGHT_LLM_PROVIDER as LlmProviderName | undefined) || "anthropic",
  model: process.env.GREENLIGHT_LLM_MODEL || "claude-sonnet-5",
  maxInputCharacters: 80000,
  allowExternalScriptAnalysis: false
};

export function normalizeLlmProviderSettings(value: unknown): LlmProviderSettings {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const provider = typeof record.provider === "string" && ["anthropic", "openai", "disabled"].includes(record.provider)
    ? record.provider as LlmProviderName
    : defaultLlmProviderSettings.provider;
  return {
    enabled: typeof record.enabled === "boolean" ? record.enabled : defaultLlmProviderSettings.enabled,
    provider,
    model: typeof record.model === "string" && record.model.trim() ? record.model.trim().slice(0, 120) : defaultLlmProviderSettings.model,
    maxInputCharacters: clampNumber(record.maxInputCharacters, 1000, 200000, defaultLlmProviderSettings.maxInputCharacters),
    allowExternalScriptAnalysis: typeof record.allowExternalScriptAnalysis === "boolean" ? record.allowExternalScriptAnalysis : defaultLlmProviderSettings.allowExternalScriptAnalysis,
    encryptedApiKey: typeof record.encryptedApiKey === "string" && record.encryptedApiKey ? record.encryptedApiKey : undefined
  };
}

export function publicLlmProviderSettings(settings: LlmProviderSettings) {
  const envKeyConfigured = settings.provider === "anthropic"
    ? Boolean(process.env.ANTHROPIC_API_KEY)
    : settings.provider === "openai"
      ? Boolean(process.env.OPENAI_API_KEY)
      : false;
  return {
    enabled: settings.enabled,
    provider: settings.provider,
    model: settings.model,
    maxInputCharacters: settings.maxInputCharacters,
    allowExternalScriptAnalysis: settings.allowExternalScriptAnalysis,
    apiKeyConfigured: Boolean(settings.encryptedApiKey) || envKeyConfigured,
    apiKeySource: settings.encryptedApiKey ? "admin" : envKeyConfigured ? "environment" : "missing"
  };
}

export async function readStoredLlmProviderSettings() {
  const setting = await prisma.appSetting.findUnique({ where: { key: LLM_PROVIDER_KEY } });
  return normalizeLlmProviderSettings(setting?.valueJson);
}

export async function resolveLlmApiKey(settings: LlmProviderSettings) {
  if (settings.encryptedApiKey) {
    const decrypted = decryptSecret(settings.encryptedApiKey);
    if (decrypted) return decrypted;
  }
  if (settings.provider === "anthropic") return process.env.ANTHROPIC_API_KEY || "";
  if (settings.provider === "openai") return process.env.OPENAI_API_KEY || "";
  return "";
}

export function encryptSecret(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const secret = process.env.LLM_SECRET_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("LLM_SECRET_KEY must be set to at least 32 characters before API keys can be saved in Admin Settings.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptSecret(value: string) {
  const secret = process.env.LLM_SECRET_KEY;
  if (!secret || secret.length < 32) return "";
  try {
    const [version, iv, tag, encrypted] = value.split(":");
    if (version !== "v1" || !iv || !tag || !encrypted) return "";
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

function encryptionKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}
