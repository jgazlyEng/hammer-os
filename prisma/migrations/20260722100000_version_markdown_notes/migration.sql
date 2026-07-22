ALTER TABLE "DocumentVersion"
  ADD COLUMN IF NOT EXISTS "markdownNotes" TEXT;
