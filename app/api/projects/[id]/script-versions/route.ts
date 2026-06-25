import { NextResponse } from "next/server";
import { forbidden, isDatabaseConfigured, requireUser, userCanAccessProject } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(_request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!userCanAccessProject(auth.user, params.id)) return NextResponse.json(forbidden(), { status: 403 });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ scriptVersions: [], mode: "demo" });
  }

  try {
    const scriptVersions = await prisma.scriptVersion.findMany({
      where: { projectId: params.id },
      orderBy: { uploadedAt: "desc" },
      include: {
        file: true,
        parsedScenes: {
          orderBy: { sceneNumber: "asc" },
          include: {
            characters: { include: { character: true } },
            environments: { include: { environment: true } },
            props: { include: { prop: true } }
          }
        }
      }
    });

    return NextResponse.json({ scriptVersions });
  } catch {
    return NextResponse.json({ scriptVersions: [], mode: "database-unavailable" });
  }
}
