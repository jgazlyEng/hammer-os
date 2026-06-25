import { createHash } from "node:crypto";

export interface UploadFileInput {
  projectId: string;
  fileName: string;
  bytes: Buffer;
  contentType: string;
  scope: "document-version" | "asset-original" | "asset-thumbnail" | "business";
  documentId?: string;
  versionId?: string;
  assetId?: string;
}

export class StorageService {
  async uploadFile(input: UploadFileInput) {
    validateUpload(input.fileName, input.contentType, input.bytes.byteLength);
    const storagePath = this.generateStoragePath(input);
    const checksum = createHash("sha256").update(input.bytes).digest("hex");

    if (process.env.UPLOAD_STORAGE_DRIVER !== "gcs") {
      return { storagePath, checksum, fileSize: input.bytes.byteLength };
    }

    const bucket = await this.bucket();
    await bucket.file(storagePath).save(input.bytes, {
      resumable: false,
      metadata: {
        contentType: input.contentType,
        metadata: { checksum, projectId: input.projectId }
      }
    });
    return { storagePath, checksum, fileSize: input.bytes.byteLength };
  }

  async getSignedReadUrl(storagePath: string, expiresInMinutes = 10) {
    if (process.env.UPLOAD_STORAGE_DRIVER !== "gcs") return storagePath;
    const bucket = await this.bucket();
    const [url] = await bucket.file(storagePath).getSignedUrl({
      action: "read",
      expires: Date.now() + expiresInMinutes * 60 * 1000
    });
    return url;
  }

  async deleteFile(storagePath: string) {
    if (process.env.UPLOAD_STORAGE_DRIVER !== "gcs") return;
    const bucket = await this.bucket();
    await bucket.file(storagePath).delete({ ignoreNotFound: true });
  }

  generateStoragePath(input: Omit<UploadFileInput, "bytes" | "contentType">) {
    const fileName = sanitizeFileName(input.fileName);
    if (input.scope === "document-version") {
      return `projects/${input.projectId}/documents/${input.documentId}/versions/${input.versionId}/${fileName}`;
    }
    if (input.scope === "asset-original") {
      return `projects/${input.projectId}/assets/${input.assetId}/original/${fileName}`;
    }
    if (input.scope === "asset-thumbnail") {
      return `projects/${input.projectId}/assets/${input.assetId}/thumbnails/${fileName}`;
    }
    return `projects/${input.projectId}/business/${input.documentId}/${fileName}`;
  }

  private async bucket() {
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) throw new Error("GCS_BUCKET_NAME is required for GCS storage.");
    const { Storage } = await import("@google-cloud/storage");
    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY ? {
        client_email: process.env.GCS_CLIENT_EMAIL,
        private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, "\n")
      } : undefined
    });
    return storage.bucket(bucketName);
  }
}

export const storageService = new StorageService();

export function validateUpload(fileName: string, contentType: string, sizeBytes: number) {
  const allowed = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
    "image/webp",
    "video/mp4"
  ]);
  if (!allowed.has(contentType)) throw new Error(`Unsupported upload type for ${fileName}.`);
  if (sizeBytes > 100 * 1024 * 1024) throw new Error("Uploads must be 100MB or smaller for the MVP.");
}

function sanitizeFileName(value: string) {
  return value.replace(/[/\\?%*:|"<>]/g, "-");
}
