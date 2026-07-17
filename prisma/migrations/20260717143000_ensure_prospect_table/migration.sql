-- Some production databases may have recorded the old slate rename migrations
-- without ending up with the final Prospect table. Ensure the current schema
-- has the table the app and seed script expect.
CREATE TABLE IF NOT EXISTS "Prospect" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "externalId" TEXT,
  "logline" TEXT,
  "genre" TEXT,
  "lane" TEXT,
  "creator" TEXT,
  "priorityScore" DOUBLE PRECISION,
  "subgenreTags" TEXT,
  "urgencyLabel" TEXT,
  "discoveryStage" TEXT,
  "countryLanguage" TEXT,
  "platformSource" TEXT,
  "whyItMatters" TEXT,
  "signalProof" TEXT,
  "sourceLink" TEXT,
  "rightsStatus" TEXT,
  "rightsHolder" TEXT,
  "contactRep" TEXT,
  "adaptationFormat" TEXT,
  "comps" TEXT,
  "heatScore" DOUBLE PRECISION,
  "conceptScore" DOUBLE PRECISION,
  "adaptabilityScore" DOUBLE PRECISION,
  "rightsOpportunityScore" DOUBLE PRECISION,
  "studioFitScore" DOUBLE PRECISION,
  "nextActionStatus" TEXT,
  "owner" TEXT,
  "nextStep" TEXT,
  "lastUpdated" TEXT,
  "notes" TEXT,
  "projectCover" TEXT,
  "searchKeywords" TEXT,
  "originalReleaseDate" TEXT,
  "myPicks" TEXT,
  "actionItems" TEXT,
  "country" TEXT,
  "votes" DOUBLE PRECISION,
  "yearWritten" TEXT,
  "scriptStatus" TEXT,
  "format" TEXT,
  "scriptPdf" TEXT,
  "promotedProjectId" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Prospect_externalId_key" ON "Prospect"("externalId");
CREATE INDEX IF NOT EXISTS "Prospect_lane_idx" ON "Prospect"("lane");
CREATE INDEX IF NOT EXISTS "Prospect_genre_idx" ON "Prospect"("genre");
CREATE INDEX IF NOT EXISTS "Prospect_urgencyLabel_idx" ON "Prospect"("urgencyLabel");
CREATE INDEX IF NOT EXISTS "Prospect_rightsStatus_idx" ON "Prospect"("rightsStatus");
CREATE INDEX IF NOT EXISTS "Prospect_nextActionStatus_idx" ON "Prospect"("nextActionStatus");
CREATE INDEX IF NOT EXISTS "Prospect_owner_idx" ON "Prospect"("owner");
CREATE INDEX IF NOT EXISTS "Prospect_scriptStatus_idx" ON "Prospect"("scriptStatus");
CREATE INDEX IF NOT EXISTS "Prospect_promotedProjectId_idx" ON "Prospect"("promotedProjectId");
CREATE INDEX IF NOT EXISTS "Prospect_deletedAt_idx" ON "Prospect"("deletedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Prospect_promotedProjectId_fkey'
  ) THEN
    ALTER TABLE "Prospect"
      ADD CONSTRAINT "Prospect_promotedProjectId_fkey"
      FOREIGN KEY ("promotedProjectId") REFERENCES "Project"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
