import { NextResponse } from "next/server";
import { forbidden, isDatabaseConfigured, requireUser, userCanUploadScripts } from "@/lib/auth";
import { ingestScriptVersion } from "@/lib/server-script-ingest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const formData = await request.formData();
  const projectId = formData.get("projectId");
  const versionName = formData.get("versionName");
  const uploadedBy = formData.get("uploadedBy");
  const file = formData.get("file");

  if (typeof projectId !== "string" || !projectId.trim()) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  if (!userCanUploadScripts(auth.user, projectId)) {
    return NextResponse.json(forbidden(), { status: 403 });
  }

  if (typeof versionName !== "string" || !versionName.trim()) {
    return NextResponse.json({ error: "versionName is required." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
  }
  if (!isAllowedScriptUploadFile(file)) {
    return NextResponse.json({ error: "DOCX script parsing is disabled for now. Upload PDF, FDX, TXT, or MD instead." }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Server script upload requires DATABASE_URL. Falling back to local parser." }, { status: 503 });
  }

  try {
    const result = await ingestScriptVersion({
      projectId,
      versionName,
      uploadedBy: typeof uploadedBy === "string" && uploadedBy.trim() ? uploadedBy : auth.user.name,
      file
    });

    return NextResponse.json(result, { status: "ocrRequired" in result && result.ocrRequired ? 202 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upload error.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

function isAllowedScriptUploadFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith(".pdf") || lowerName.endsWith(".fdx") || lowerName.endsWith(".txt") || lowerName.endsWith(".text") || lowerName.endsWith(".md") || file.type === "application/pdf" || file.type === "text/plain" || file.type === "text/markdown";
}
