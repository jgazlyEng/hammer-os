ALTER TABLE "Task" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "Task"
SET "sortOrder" = ordered.row_number
FROM (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC)::INTEGER AS row_number
  FROM "Task"
) AS ordered
WHERE "Task"."id" = ordered."id";

CREATE INDEX "Task_sortOrder_idx" ON "Task"("sortOrder");
