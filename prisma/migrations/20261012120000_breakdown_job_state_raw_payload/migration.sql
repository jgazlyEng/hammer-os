CREATE TYPE "BreakdownJobState" AS ENUM ('QUEUED', 'PREPARING_TEXT', 'RUNNING_CLAUDE', 'RAW_SAVED', 'READY_FOR_REVIEW', 'INDEXING', 'INDEXED', 'PARTIAL', 'FAILED');

ALTER TABLE "BreakdownRun"
  ADD COLUMN "jobState" "BreakdownJobState" NOT NULL DEFAULT 'QUEUED',
  ADD COLUMN "rawResultJson" JSONB,
  ADD COLUMN "rawSavedAt" TIMESTAMP(3),
  ADD COLUMN "indexedAt" TIMESTAMP(3);

UPDATE "BreakdownRun"
SET "jobState" = CASE
  WHEN "status" = 'RUNNING' THEN 'RUNNING_CLAUDE'::"BreakdownJobState"
  WHEN "status" = 'READY_FOR_REVIEW' THEN 'INDEXED'::"BreakdownJobState"
  WHEN "status" = 'APPROVED' THEN 'INDEXED'::"BreakdownJobState"
  WHEN "status" = 'FAILED' THEN 'FAILED'::"BreakdownJobState"
  ELSE 'QUEUED'::"BreakdownJobState"
END;

CREATE INDEX "BreakdownRun_jobState_idx" ON "BreakdownRun"("jobState");
