import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { NextResponse } from "next/server";
import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type DownloadType = "documentVersion" | "supportingDocument" | "prospectAsset" | "asset";

interface DownloadableFile {
  id: string;
  fileName: string;
  fileType: string;
  storagePath: string;
  dataUrl?: string | null;
  projectId?: string | null;
  prospectId?: string | null;
  title?: string;
}

export async function GET(request: Request) {
  const auth = requireUser(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!canDownload(auth.user.appRole)) {
    return NextResponse.json({ error: "Download access requires admin, producer, or executive access." }, { status: 403 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") as DownloadType | null;
  const id = url.searchParams.get("id");
  const shouldWatermark = url.searchParams.get("watermark") === "1";
  const includeIp = url.searchParams.get("ip") !== "0";
  if (!type || !id) return NextResponse.json({ error: "Missing download type or id." }, { status: 400 });

  const file = await findDownloadableFile(type, id);
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });

  const source = await readStoredFile(file);
  const downloadedAt = new Date();
  const ipAddress = includeIp ? clientIp(request) : undefined;
  const watermarkText = `${auth.user.email} | ${downloadedAt.toISOString()}${ipAddress ? ` | IP ${ipAddress}` : ""}`;
  const output = shouldWatermark
    ? await watermarkFile(source.bytes, file.fileName, file.fileType, watermarkText)
    : { bytes: source.bytes, fileName: file.fileName, contentType: source.contentType || file.fileType || "application/octet-stream" };

  await prisma.auditLog.create({
    data: {
      actorUserId: auth.user.id,
      actor: auth.user.email,
      action: shouldWatermark ? "file.downloaded_watermarked" : "file.downloaded_original",
      entityType: type,
      entityId: id,
      projectId: file.projectId ?? undefined,
      detailJson: {
        fileName: file.fileName,
        watermark: shouldWatermark,
        includeIp,
        ipAddress
      }
    }
  }).catch(() => undefined);

  return new NextResponse(new Uint8Array(output.bytes), {
    headers: {
      "Content-Type": output.contentType,
      "Content-Disposition": `attachment; filename="${sanitizeDownloadName(output.fileName)}"`,
      "Cache-Control": "no-store"
    }
  });
}

async function findDownloadableFile(type: DownloadType, id: string): Promise<DownloadableFile | null> {
  if (type === "documentVersion") {
    const version = await prisma.documentVersion.findUnique({ where: { id }, include: { document: true } });
    if (!version || version.document.deletedAt) return null;
    return {
      id: version.id,
      fileName: version.fileName,
      fileType: version.fileType,
      storagePath: version.storagePath,
      dataUrl: version.dataUrl,
      projectId: version.document.projectId,
      title: version.document.title
    };
  }
  if (type === "supportingDocument") {
    const document = await prisma.supportingDocument.findUnique({ where: { id } });
    if (!document || document.deletedAt) return null;
    return document;
  }
  if (type === "prospectAsset") {
    const asset = await prisma.prospectAsset.findUnique({ where: { id } });
    if (!asset || asset.deletedAt) return null;
    return asset;
  }
  if (type === "asset") {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset || asset.deletedAt) return null;
    return asset;
  }
  return null;
}

async function readStoredFile(file: DownloadableFile) {
  if (file.dataUrl?.startsWith("data:")) return dataUrlToFile(file.dataUrl, file.fileType);
  if (file.storagePath.startsWith("gs://")) return readGcsFile(file.storagePath, file.fileType);
  return {
    bytes: await readFile(file.storagePath),
    contentType: file.fileType || "application/octet-stream"
  };
}

async function readGcsFile(storagePath: string, contentType: string) {
  const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(storagePath);
  if (!match) throw new Error("Invalid GCS storage path.");
  const { Storage } = await import("@google-cloud/storage");
  const [bucketName, objectName] = [match[1], match[2]];
  const [bytes] = await new Storage().bucket(bucketName).file(objectName).download();
  return { bytes, contentType: contentType || "application/octet-stream" };
}

function dataUrlToFile(dataUrl: string, fallbackContentType: string) {
  const [metadata, payload] = dataUrl.split(",", 2);
  const contentType = /^data:([^;,]+)/.exec(metadata)?.[1] ?? fallbackContentType;
  const isBase64 = metadata.includes(";base64");
  return {
    bytes: Buffer.from(payload ?? "", isBase64 ? "base64" : "utf8"),
    contentType
  };
}

async function watermarkFile(bytes: Buffer, fileName: string, contentType: string, watermarkText: string) {
  const lowerName = fileName.toLowerCase();
  if (contentType === "application/pdf" || lowerName.endsWith(".pdf")) {
    return {
      bytes: await watermarkPdf(bytes, watermarkText),
      fileName: watermarkedName(fileName, "pdf"),
      contentType: "application/pdf"
    };
  }
  if (contentType.startsWith("text/") || [".txt", ".md", ".fdx"].some((extension) => lowerName.endsWith(extension))) {
    return {
      bytes: Buffer.from(`WATERMARK: ${watermarkText}\n\n${bytes.toString("utf8")}`, "utf8"),
      fileName: watermarkedName(fileName, "txt"),
      contentType: "text/plain; charset=utf-8"
    };
  }
  if (contentType.startsWith("image/")) {
    return {
      bytes: Buffer.from(watermarkImageSvg(bytes, contentType, fileName, watermarkText), "utf8"),
      fileName: watermarkedName(fileName, "svg"),
      contentType: "image/svg+xml; charset=utf-8"
    };
  }
  return {
    bytes: Buffer.from(`WATERMARK: ${watermarkText}\nORIGINAL FILE: ${fileName}\n\nThis file type cannot be modified safely by GreenLight yet. Download the original only when approved by policy.`, "utf8"),
    fileName: watermarkedName(fileName, "txt"),
    contentType: "text/plain; charset=utf-8"
  };
}

async function watermarkPdf(bytes: Buffer, watermarkText: string) {
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    page.drawText(watermarkText, {
      x: Math.max(32, width * 0.08),
      y: height * 0.52,
      size: 18,
      font,
      color: rgb(0.05, 0.35, 0.14),
      opacity: 0.22,
      rotate: degrees(-32)
    });
    page.drawText(watermarkText, {
      x: 28,
      y: 20,
      size: 8,
      font,
      color: rgb(0.05, 0.25, 0.11),
      opacity: 0.55
    });
  }
  return Buffer.from(await pdf.save());
}

function watermarkImageSvg(bytes: Buffer, contentType: string, fileName: string, watermarkText: string) {
  const encoded = bytes.toString("base64");
  const safeWatermark = escapeXml(watermarkText);
  const safeTitle = escapeXml(fileName);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <title>${safeTitle}</title>
  <image href="data:${contentType};base64,${encoded}" width="1600" height="1000" preserveAspectRatio="xMidYMid meet"/>
  <rect width="1600" height="1000" fill="rgba(255,255,255,0.02)"/>
  <g transform="translate(120 650) rotate(-28)" opacity="0.28">
    <text x="0" y="0" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="#0f7a34">${safeWatermark}</text>
    <text x="0" y="84" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="#0f7a34">${safeWatermark}</text>
  </g>
  <text x="32" y="966" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0b5f2a" opacity="0.75">${safeWatermark}</text>
</svg>`;
}

function canDownload(role: string) {
  return role === "admin" || role === "producer" || role === "executive";
}

function clientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || undefined;
}

function watermarkedName(fileName: string, extension: string) {
  const base = basename(fileName).replace(/\.[^.]+$/, "");
  return `${base}.watermarked.${extension}`;
}

function sanitizeDownloadName(fileName: string) {
  return basename(fileName).replace(/["\r\n]/g, "-");
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
