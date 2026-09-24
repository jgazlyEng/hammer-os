ALTER TABLE "Prospect"
  ADD COLUMN "airtableBaseId" TEXT,
  ADD COLUMN "airtableTableName" TEXT,
  ADD COLUMN "airtableRecordId" TEXT,
  ADD COLUMN "airtableCreatedTime" TIMESTAMP(3),
  ADD COLUMN "airtableLastSyncedAt" TIMESTAMP(3),
  ADD COLUMN "airtableFieldsJson" JSONB;

CREATE INDEX "Prospect_airtableTableName_idx" ON "Prospect"("airtableTableName");
CREATE INDEX "Prospect_airtableRecordId_idx" ON "Prospect"("airtableRecordId");
CREATE INDEX "Prospect_airtableLastSyncedAt_idx" ON "Prospect"("airtableLastSyncedAt");
CREATE UNIQUE INDEX "Prospect_airtableBaseId_airtableTableName_airtableRecordId_key" ON "Prospect"("airtableBaseId", "airtableTableName", "airtableRecordId");
