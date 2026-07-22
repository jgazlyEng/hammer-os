CREATE TABLE IF NOT EXISTS "ProspectAsset" (
  "id" TEXT NOT NULL,
  "prospectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL,
  "dataUrl" TEXT,
  "uploadedById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProspectAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProspectAsset_prospectId_idx" ON "ProspectAsset"("prospectId");
CREATE INDEX IF NOT EXISTS "ProspectAsset_uploadedById_idx" ON "ProspectAsset"("uploadedById");
CREATE INDEX IF NOT EXISTS "ProspectAsset_deletedAt_idx" ON "ProspectAsset"("deletedAt");

ALTER TABLE "ProspectAsset"
  ADD CONSTRAINT "ProspectAsset_prospectId_fkey"
  FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProspectAsset"
  ADD CONSTRAINT "ProspectAsset_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
