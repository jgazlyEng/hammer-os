CREATE TYPE "UploadJobStatus" AS ENUM ('RECEIVED', 'STORED', 'PARSING', 'COMPLETE', 'WARNING', 'FAILED');

CREATE TABLE "UploadJob" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "status" "UploadJobStatus" NOT NULL DEFAULT 'RECEIVED',
  "stage" TEXT NOT NULL DEFAULT 'received',
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "storagePath" TEXT,
  "projectId" TEXT,
  "documentId" TEXT,
  "documentVersionId" TEXT,
  "createdById" TEXT,
  "warning" TEXT,
  "error" TEXT,
  "detailJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "UploadJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UploadJob_requestId_key" ON "UploadJob"("requestId");
CREATE INDEX "UploadJob_status_idx" ON "UploadJob"("status");
CREATE INDEX "UploadJob_projectId_idx" ON "UploadJob"("projectId");
CREATE INDEX "UploadJob_documentId_idx" ON "UploadJob"("documentId");
CREATE INDEX "UploadJob_documentVersionId_idx" ON "UploadJob"("documentVersionId");
CREATE INDEX "UploadJob_createdById_idx" ON "UploadJob"("createdById");
CREATE INDEX "UploadJob_createdAt_idx" ON "UploadJob"("createdAt");

ALTER TABLE "UploadJob" ADD CONSTRAINT "UploadJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UploadJob" ADD CONSTRAINT "UploadJob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UploadJob" ADD CONSTRAINT "UploadJob_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UploadJob" ADD CONSTRAINT "UploadJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
