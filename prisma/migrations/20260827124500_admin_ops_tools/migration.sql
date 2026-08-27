-- Add durable admin operations tables.
CREATE TABLE IF NOT EXISTS "ImportHistory" (
  "id" TEXT NOT NULL,
  "importType" TEXT NOT NULL,
  "fileName" TEXT,
  "actorUserId" TEXT,
  "actor" TEXT,
  "rowsReceived" INTEGER NOT NULL DEFAULT 0,
  "rowsCreated" INTEGER NOT NULL DEFAULT 0,
  "rowsUpdated" INTEGER NOT NULL DEFAULT 0,
  "rowsRestored" INTEGER NOT NULL DEFAULT 0,
  "rowsSkipped" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'COMPLETE',
  "error" TEXT,
  "detailJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AppSetting" (
  "key" TEXT NOT NULL,
  "valueJson" JSONB NOT NULL,
  "updatedById" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "ImportHistory_importType_idx" ON "ImportHistory"("importType");
CREATE INDEX IF NOT EXISTS "ImportHistory_actorUserId_idx" ON "ImportHistory"("actorUserId");
CREATE INDEX IF NOT EXISTS "ImportHistory_status_idx" ON "ImportHistory"("status");
CREATE INDEX IF NOT EXISTS "ImportHistory_createdAt_idx" ON "ImportHistory"("createdAt");
CREATE INDEX IF NOT EXISTS "AppSetting_updatedAt_idx" ON "AppSetting"("updatedAt");
