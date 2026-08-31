CREATE TABLE "ScriptCoverage" (
  "id" TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "aiStatus" TEXT NOT NULL DEFAULT 'NOT_RUN',
  "aiModel" TEXT,
  "aiSummaryJson" JSONB,
  "aiGeneratedAt" TIMESTAMP(3),
  "humanOverallScore" INTEGER,
  "humanRecommendation" TEXT,
  "humanCriteriaJson" JSONB,
  "humanNotes" TEXT,
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ScriptCoverage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScriptCoverage_documentVersionId_key" ON "ScriptCoverage"("documentVersionId");
CREATE INDEX "ScriptCoverage_aiStatus_idx" ON "ScriptCoverage"("aiStatus");
CREATE INDEX "ScriptCoverage_humanOverallScore_idx" ON "ScriptCoverage"("humanOverallScore");
CREATE INDEX "ScriptCoverage_humanRecommendation_idx" ON "ScriptCoverage"("humanRecommendation");
CREATE INDEX "ScriptCoverage_updatedAt_idx" ON "ScriptCoverage"("updatedAt");

ALTER TABLE "ScriptCoverage"
  ADD CONSTRAINT "ScriptCoverage_documentVersionId_fkey"
  FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScriptCoverage"
  ADD CONSTRAINT "ScriptCoverage_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScriptCoverage"
  ADD CONSTRAINT "ScriptCoverage_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
