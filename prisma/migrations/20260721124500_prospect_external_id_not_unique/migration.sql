DROP INDEX IF EXISTS "Prospect_externalId_key";

CREATE INDEX IF NOT EXISTS "Prospect_externalId_idx" ON "Prospect"("externalId");
