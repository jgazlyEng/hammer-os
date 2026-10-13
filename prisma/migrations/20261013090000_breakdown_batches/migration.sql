CREATE TYPE "BreakdownBatchStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');

CREATE TABLE "BreakdownBatch" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "batchNumber" INTEGER NOT NULL,
  "totalBatches" INTEGER NOT NULL,
  "status" "BreakdownBatchStatus" NOT NULL DEFAULT 'QUEUED',
  "sceneStartIndex" INTEGER NOT NULL,
  "sceneEndIndex" INTEGER NOT NULL,
  "sceneCount" INTEGER NOT NULL,
  "sceneOutlineJson" JSONB,
  "rawResultJson" JSONB,
  "elementCount" INTEGER NOT NULL DEFAULT 0,
  "sceneResultCount" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BreakdownBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BreakdownBatch_runId_batchNumber_key" ON "BreakdownBatch"("runId", "batchNumber");
CREATE INDEX "BreakdownBatch_runId_status_idx" ON "BreakdownBatch"("runId", "status");
CREATE INDEX "BreakdownBatch_projectId_idx" ON "BreakdownBatch"("projectId");
CREATE INDEX "BreakdownBatch_documentVersionId_idx" ON "BreakdownBatch"("documentVersionId");
CREATE INDEX "BreakdownBatch_status_idx" ON "BreakdownBatch"("status");

ALTER TABLE "BreakdownBatch"
  ADD CONSTRAINT "BreakdownBatch_runId_fkey" FOREIGN KEY ("runId") REFERENCES "BreakdownRun"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "BreakdownBatch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "BreakdownBatch_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
