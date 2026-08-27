import { NextResponse } from "next/server";
import { isDatabaseConfigured, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ mode: "demo", summary: { total: 0, complete: 0, failed: 0, rowsCreated: 0, rowsUpdated: 0 }, imports: [] });
  }

  try {
    const imports = await prisma.importHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: 80
    });
    return NextResponse.json({
      mode: "database",
      summary: imports.reduce((accumulator, item) => {
        accumulator.total += 1;
        if (item.status === "FAILED") accumulator.failed += 1;
        else accumulator.complete += 1;
        accumulator.rowsCreated += item.rowsCreated;
        accumulator.rowsUpdated += item.rowsUpdated;
        return accumulator;
      }, { total: 0, complete: 0, failed: 0, rowsCreated: 0, rowsUpdated: 0 }),
      imports: imports.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))
    });
  } catch (error) {
    return NextResponse.json({ mode: "database", error: error instanceof Error ? error.message : "Import history failed.", summary: { total: 0, complete: 0, failed: 0, rowsCreated: 0, rowsUpdated: 0 }, imports: [] }, { status: 503 });
  }
}
