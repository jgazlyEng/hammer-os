CREATE TYPE "OutreachEngagementType" AS ENUM (
  'CALL',
  'MEETING',
  'EMAIL',
  'INTRO',
  'MATERIALS_SENT',
  'FOLLOW_UP',
  'NOTE',
  'OTHER'
);

CREATE TABLE "OutreachEngagement" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "type" "OutreachEngagementType" NOT NULL DEFAULT 'MEETING',
  "engagementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "ContactStatus" NOT NULL DEFAULT 'ACTIVE',
  "summary" TEXT NOT NULL,
  "nextStep" TEXT,
  "followUpDate" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OutreachEngagement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OutreachEngagement_contactId_idx" ON "OutreachEngagement"("contactId");
CREATE INDEX "OutreachEngagement_engagementDate_idx" ON "OutreachEngagement"("engagementDate");
CREATE INDEX "OutreachEngagement_followUpDate_idx" ON "OutreachEngagement"("followUpDate");
CREATE INDEX "OutreachEngagement_createdById_idx" ON "OutreachEngagement"("createdById");

ALTER TABLE "OutreachEngagement"
  ADD CONSTRAINT "OutreachEngagement_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OutreachEngagement"
  ADD CONSTRAINT "OutreachEngagement_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
