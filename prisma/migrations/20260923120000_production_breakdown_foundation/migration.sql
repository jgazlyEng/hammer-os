ALTER TYPE "CommentTargetType" ADD VALUE IF NOT EXISTS 'BREAKDOWN_RUN';
ALTER TYPE "CommentTargetType" ADD VALUE IF NOT EXISTS 'BREAKDOWN_ELEMENT';

ALTER TYPE "TaskTargetType" ADD VALUE IF NOT EXISTS 'BREAKDOWN_RUN';
ALTER TYPE "TaskTargetType" ADD VALUE IF NOT EXISTS 'BREAKDOWN_ELEMENT';

CREATE TYPE "BreakdownRunStatus" AS ENUM (
  'DRAFT',
  'RUNNING',
  'READY_FOR_REVIEW',
  'NEEDS_REVISION',
  'APPROVED',
  'ARCHIVED',
  'FAILED'
);

CREATE TYPE "BreakdownTaxonomyCategory" AS ENUM (
  'CHARACTER',
  'EXTRAS',
  'LOCATION',
  'PROP',
  'VEHICLE',
  'WARDROBE',
  'SFX',
  'ANIMAL',
  'ACTION',
  'VFX',
  'NOTE',
  'OTHER'
);

CREATE TYPE "BreakdownElementStatus" AS ENUM (
  'UNREVIEWED',
  'ACCEPTED',
  'IGNORED',
  'MERGED',
  'NEEDS_REVIEW'
);

CREATE TYPE "BreakdownPageSource" AS ENUM (
  'MEASURED',
  'ESTIMATED',
  'UNKNOWN'
);

CREATE TYPE "TagScope" AS ENUM (
  'DOCUMENT',
  'BREAKDOWN',
  'ASSET',
  'PROJECT',
  'PROSPECT'
);

CREATE TABLE "Tag" (
  "id" TEXT NOT NULL,
  "scope" "TagScope" NOT NULL DEFAULT 'BREAKDOWN',
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "label" TEXT,
  "description" TEXT,
  "color" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BreakdownRun" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "documentId" TEXT,
  "documentVersionId" TEXT NOT NULL,
  "parserName" TEXT NOT NULL DEFAULT 'greenlight-production-breakdown',
  "parserVersion" TEXT,
  "status" "BreakdownRunStatus" NOT NULL DEFAULT 'DRAFT',
  "summaryJson" JSONB,
  "statsJson" JSONB,
  "warning" TEXT,
  "error" TEXT,
  "createdById" TEXT,
  "approvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),

  CONSTRAINT "BreakdownRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BreakdownElement" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "entityId" TEXT,
  "stableKey" TEXT NOT NULL,
  "category" "BreakdownTaxonomyCategory" NOT NULL,
  "displayName" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "description" TEXT,
  "evidenceText" TEXT,
  "sourceText" TEXT,
  "firstPageNumber" DOUBLE PRECISION,
  "lastPageNumber" DOUBLE PRECISION,
  "pageSource" "BreakdownPageSource" NOT NULL DEFAULT 'UNKNOWN',
  "confidence" DOUBLE PRECISION,
  "status" "BreakdownElementStatus" NOT NULL DEFAULT 'UNREVIEWED',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BreakdownElement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BreakdownSceneElement" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "breakdownElementId" TEXT NOT NULL,
  "sceneId" TEXT,
  "sceneNumber" TEXT,
  "sceneHeading" TEXT,
  "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
  "firstPageNumber" DOUBLE PRECISION,
  "lastPageNumber" DOUBLE PRECISION,
  "importance" "EntityImportance" NOT NULL DEFAULT 'MEDIUM',
  "evidenceText" TEXT,
  "notes" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BreakdownSceneElement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BreakdownElementTag" (
  "id" TEXT NOT NULL,
  "breakdownElementId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BreakdownElementTag_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AssetLink" ADD COLUMN "breakdownElementId" TEXT;

CREATE UNIQUE INDEX "Tag_scope_key_value_key" ON "Tag"("scope", "key", "value");
CREATE INDEX "Tag_scope_idx" ON "Tag"("scope");
CREATE INDEX "Tag_key_idx" ON "Tag"("key");
CREATE INDEX "Tag_value_idx" ON "Tag"("value");

CREATE INDEX "BreakdownRun_projectId_idx" ON "BreakdownRun"("projectId");
CREATE INDEX "BreakdownRun_documentId_idx" ON "BreakdownRun"("documentId");
CREATE INDEX "BreakdownRun_documentVersionId_idx" ON "BreakdownRun"("documentVersionId");
CREATE INDEX "BreakdownRun_status_idx" ON "BreakdownRun"("status");
CREATE INDEX "BreakdownRun_createdAt_idx" ON "BreakdownRun"("createdAt");

CREATE UNIQUE INDEX "BreakdownElement_runId_stableKey_key" ON "BreakdownElement"("runId", "stableKey");
CREATE INDEX "BreakdownElement_projectId_idx" ON "BreakdownElement"("projectId");
CREATE INDEX "BreakdownElement_documentVersionId_idx" ON "BreakdownElement"("documentVersionId");
CREATE INDEX "BreakdownElement_category_idx" ON "BreakdownElement"("category");
CREATE INDEX "BreakdownElement_status_idx" ON "BreakdownElement"("status");
CREATE INDEX "BreakdownElement_normalizedName_idx" ON "BreakdownElement"("normalizedName");
CREATE INDEX "BreakdownElement_entityId_idx" ON "BreakdownElement"("entityId");

CREATE UNIQUE INDEX "BreakdownSceneElement_breakdownElementId_sceneId_sceneNumber_key" ON "BreakdownSceneElement"("breakdownElementId", "sceneId", "sceneNumber");
CREATE INDEX "BreakdownSceneElement_runId_idx" ON "BreakdownSceneElement"("runId");
CREATE INDEX "BreakdownSceneElement_breakdownElementId_idx" ON "BreakdownSceneElement"("breakdownElementId");
CREATE INDEX "BreakdownSceneElement_sceneId_idx" ON "BreakdownSceneElement"("sceneId");
CREATE INDEX "BreakdownSceneElement_sceneNumber_idx" ON "BreakdownSceneElement"("sceneNumber");

CREATE UNIQUE INDEX "BreakdownElementTag_breakdownElementId_tagId_key" ON "BreakdownElementTag"("breakdownElementId", "tagId");
CREATE INDEX "BreakdownElementTag_tagId_idx" ON "BreakdownElementTag"("tagId");

CREATE INDEX "AssetLink_breakdownElementId_idx" ON "AssetLink"("breakdownElementId");

ALTER TABLE "BreakdownRun"
  ADD CONSTRAINT "BreakdownRun_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BreakdownRun"
  ADD CONSTRAINT "BreakdownRun_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BreakdownRun"
  ADD CONSTRAINT "BreakdownRun_documentVersionId_fkey"
  FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BreakdownRun"
  ADD CONSTRAINT "BreakdownRun_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BreakdownRun"
  ADD CONSTRAINT "BreakdownRun_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BreakdownElement"
  ADD CONSTRAINT "BreakdownElement_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "BreakdownRun"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BreakdownElement"
  ADD CONSTRAINT "BreakdownElement_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BreakdownElement"
  ADD CONSTRAINT "BreakdownElement_documentVersionId_fkey"
  FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BreakdownElement"
  ADD CONSTRAINT "BreakdownElement_entityId_fkey"
  FOREIGN KEY ("entityId") REFERENCES "Entity"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BreakdownSceneElement"
  ADD CONSTRAINT "BreakdownSceneElement_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "BreakdownRun"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BreakdownSceneElement"
  ADD CONSTRAINT "BreakdownSceneElement_breakdownElementId_fkey"
  FOREIGN KEY ("breakdownElementId") REFERENCES "BreakdownElement"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BreakdownSceneElement"
  ADD CONSTRAINT "BreakdownSceneElement_sceneId_fkey"
  FOREIGN KEY ("sceneId") REFERENCES "Scene"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BreakdownElementTag"
  ADD CONSTRAINT "BreakdownElementTag_breakdownElementId_fkey"
  FOREIGN KEY ("breakdownElementId") REFERENCES "BreakdownElement"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BreakdownElementTag"
  ADD CONSTRAINT "BreakdownElementTag_tagId_fkey"
  FOREIGN KEY ("tagId") REFERENCES "Tag"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetLink"
  ADD CONSTRAINT "AssetLink_breakdownElementId_fkey"
  FOREIGN KEY ("breakdownElementId") REFERENCES "BreakdownElement"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
