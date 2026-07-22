ALTER TABLE "DocumentVersion"
  ADD COLUMN IF NOT EXISTS "dataUrl" TEXT;

ALTER TABLE "SupportingDocument"
  ADD COLUMN IF NOT EXISTS "dataUrl" TEXT;
