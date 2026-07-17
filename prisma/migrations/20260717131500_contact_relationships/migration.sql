CREATE TYPE "ContactRelationshipType" AS ENUM (
  'AGENT',
  'MANAGER',
  'REPRESENTS',
  'WORKS_WITH',
  'ASSISTANT',
  'LEGAL_REP',
  'REFERRED_BY',
  'OTHER'
);

CREATE TABLE "ContactRelationship" (
  "id" TEXT NOT NULL,
  "fromContactId" TEXT NOT NULL,
  "toContactId" TEXT NOT NULL,
  "relationshipType" "ContactRelationshipType" NOT NULL DEFAULT 'OTHER',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContactRelationship_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContactRelationship_fromContactId_toContactId_relationshipType_key"
  ON "ContactRelationship"("fromContactId", "toContactId", "relationshipType");

CREATE INDEX "ContactRelationship_toContactId_idx" ON "ContactRelationship"("toContactId");

ALTER TABLE "ContactRelationship"
  ADD CONSTRAINT "ContactRelationship_fromContactId_fkey"
  FOREIGN KEY ("fromContactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContactRelationship"
  ADD CONSTRAINT "ContactRelationship_toContactId_fkey"
  FOREIGN KEY ("toContactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
