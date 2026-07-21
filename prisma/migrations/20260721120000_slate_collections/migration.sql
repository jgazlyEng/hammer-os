DO $$ BEGIN
  CREATE TYPE "SlateCollectionItemType" AS ENUM ('PROJECT', 'PROSPECT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "SlateCollection" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "ownerId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "visibility" "CommentVisibility" NOT NULL DEFAULT 'PROJECT_TEAM',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SlateCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SlateCollectionItem" (
  "id" TEXT NOT NULL,
  "collectionId" TEXT NOT NULL,
  "itemType" "SlateCollectionItemType" NOT NULL,
  "projectId" TEXT,
  "prospectId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SlateCollectionItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SlateCollection_ownerId_idx" ON "SlateCollection"("ownerId");
CREATE INDEX IF NOT EXISTS "SlateCollection_status_idx" ON "SlateCollection"("status");
CREATE INDEX IF NOT EXISTS "SlateCollectionItem_projectId_idx" ON "SlateCollectionItem"("projectId");
CREATE INDEX IF NOT EXISTS "SlateCollectionItem_prospectId_idx" ON "SlateCollectionItem"("prospectId");
CREATE INDEX IF NOT EXISTS "SlateCollectionItem_itemType_idx" ON "SlateCollectionItem"("itemType");

CREATE UNIQUE INDEX IF NOT EXISTS "SlateCollectionItem_collectionId_itemType_projectId_key" ON "SlateCollectionItem"("collectionId", "itemType", "projectId");
CREATE UNIQUE INDEX IF NOT EXISTS "SlateCollectionItem_collectionId_itemType_prospectId_key" ON "SlateCollectionItem"("collectionId", "itemType", "prospectId");

DO $$ BEGIN
  ALTER TABLE "SlateCollection" ADD CONSTRAINT "SlateCollection_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SlateCollectionItem" ADD CONSTRAINT "SlateCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "SlateCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SlateCollectionItem" ADD CONSTRAINT "SlateCollectionItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SlateCollectionItem" ADD CONSTRAINT "SlateCollectionItem_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
