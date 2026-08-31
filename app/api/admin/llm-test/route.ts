import { NextResponse } from "next/server";
import { isDatabaseConfigured, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LLM_PROVIDER_KEY = "llm.provider";

export async function POST(request: Request) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const submittedProvider = typeof body.provider === "string" ? body.provider : undefined;
  const submittedModel = typeof body.model === "string" ? body.model.trim() : undefined;
  const settings = isDatabaseConfigured() ? await readStoredSettings() : undefined;
  const provider = submittedProvider || settings?.provider || "anthropic";
  const model = submittedModel || settings?.model || process.env.GREENLIGHT_LLM_MODEL || "claude-sonnet-5";

  if (provider === "disabled") return NextResponse.json({ error: "LLM provider is disabled." }, { status: 400 });
  if (provider !== "anthropic") return NextResponse.json({ error: "Only Claude / Anthropic test calls are enabled right now." }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 503 });

  try {
    const startedAt = Date.now();
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: 32,
        system: "You are testing a GreenLight admin LLM provider connection.",
        messages: [{ role: "user", content: "Reply with exactly: GreenLight LLM connection OK" }]
      })
    });
    const data = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok) {
      return NextResponse.json({ error: anthropicError(data) || `Claude test failed with status ${response.status}.` }, { status: 502 });
    }
    await prisma.auditLog.create({
      data: {
        actorUserId: auth.user.id,
        actor: auth.user.email,
        action: "settings.llm_connection_tested",
        entityType: "AppSetting",
        entityId: LLM_PROVIDER_KEY,
        detailJson: { provider, model, latencyMs: Date.now() - startedAt }
      }
    }).catch(() => undefined);
    return NextResponse.json({
      ok: true,
      provider,
      model,
      latencyMs: Date.now() - startedAt,
      message: extractAnthropicText(data) || "Connection succeeded."
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Claude connection test failed." }, { status: 502 });
  }
}

async function readStoredSettings() {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: LLM_PROVIDER_KEY } });
    const value = setting?.valueJson;
    const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return {
      provider: typeof record.provider === "string" ? record.provider : "anthropic",
      model: typeof record.model === "string" ? record.model : process.env.GREENLIGHT_LLM_MODEL || "claude-sonnet-5"
    };
  } catch {
    return undefined;
  }
}

function extractAnthropicText(data: Record<string, unknown> | null) {
  const content = Array.isArray(data?.content) ? data.content : [];
  for (const block of content) {
    if (block && typeof block === "object" && typeof (block as Record<string, unknown>).text === "string") return (block as Record<string, unknown>).text as string;
  }
  return "";
}

function anthropicError(data: Record<string, unknown> | null) {
  const error = data?.error;
  if (error && typeof error === "object" && typeof (error as Record<string, unknown>).message === "string") return (error as Record<string, unknown>).message as string;
  return "";
}
