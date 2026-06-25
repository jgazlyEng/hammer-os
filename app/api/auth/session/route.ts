import { NextResponse } from "next/server";
import { getDemoUser, isDatabaseConfigured, readUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = readUserFromRequest(request);

  return NextResponse.json({
    user: user ?? null,
    mode: isDatabaseConfigured() ? "database" : "demo",
    demoUser: isDatabaseConfigured() ? null : getDemoUser()
  });
}
