-- Script collections let users group scripts for review batches, management, or shared reading lists.
CREATE TABLE "ScriptCollection" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "ownerId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "visibility" "CommentVisibility" NOT NULL DEFAULT 'PROJECT_TEAM',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ScriptCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScriptCollectionItem" (
  "id" TEXT NOT NULL,
  "collectionId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScriptCollectionItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScriptCollection_ownerId_idx" ON "ScriptCollection"("ownerId");
CREATE INDEX "ScriptCollection_status_idx" ON "ScriptCollection"("status");
CREATE INDEX "ScriptCollectionItem_documentId_idx" ON "ScriptCollectionItem"("documentId");
CREATE UNIQUE INDEX "ScriptCollectionItem_collectionId_documentId_key" ON "ScriptCollectionItem"("collectionId", "documentId");

ALTER TABLE "ScriptCollection"
  ADD CONSTRAINT "ScriptCollection_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScriptCollectionItem"
  ADD CONSTRAINT "ScriptCollectionItem_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "ScriptCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScriptCollectionItem"
  ADD CONSTRAINT "ScriptCollectionItem_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
