import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredUpload {
  storagePath: string;
  checksum: string;
  sizeBytes: number;
}

export async function storeUpload(projectId: string, fileName: string, bytes: Buffer): Promise<StoredUpload> {
  if (process.env.UPLOAD_STORAGE_DRIVER === "gcs") {
    return storeUploadInGcs(projectId, fileName, bytes);
  }

  return storeUploadLocally(projectId, fileName, bytes);
}

async function storeUploadLocally(projectId: string, fileName: string, bytes: Buffer): Promise<StoredUpload> {
  const uploadRoot = process.env.UPLOAD_DIR ?? "./uploads";
  const safeProjectId = sanitizePathSegment(projectId);
  const safeFileName = sanitizeFileName(fileName);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const storageDir = path.join(uploadRoot, safeProjectId);
  const storagePath = path.join(storageDir, `${Date.now()}-${checksum.slice(0, 12)}-${safeFileName}`);

  await mkdir(storageDir, { recursive: true });
  await writeFile(storagePath, bytes);

  return {
    storagePath,
    checksum,
    sizeBytes: bytes.byteLength
  };
}

async function storeUploadInGcs(projectId: string, fileName: string, bytes: Buffer): Promise<StoredUpload> {
  const bucketName = process.env.GCS_UPLOAD_BUCKET ?? process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("GCS_UPLOAD_BUCKET or GCS_BUCKET_NAME is required when UPLOAD_STORAGE_DRIVER=gcs.");
  }

  const { Storage } = await import("@google-cloud/storage");
  const storage = new Storage();
  const safeProjectId = sanitizePathSegment(projectId);
  const safeFileName = sanitizeFileName(fileName);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const objectName = `scripts/${safeProjectId}/${Date.now()}-${checksum.slice(0, 12)}-${safeFileName}`;
  const file = storage.bucket(bucketName).file(objectName);

  await file.save(bytes, {
    resumable: false,
    metadata: {
      contentType: inferContentType(fileName),
      metadata: {
        projectId,
        checksum
      }
    }
  });

  return {
    storagePath: `gs://${bucketName}/${objectName}`,
    checksum,
    sizeBytes: bytes.byteLength
  };
}

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function sanitizeFileName(value: string) {
  return value.replace(/[/\\?%*:|"<>]/g, "-");
}

function inferContentType(fileName: string) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".fdx")) return "application/xml";
  if (lowerName.endsWith(".txt")) return "text/plain";
  if (lowerName.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}
