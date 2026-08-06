CREATE TABLE "TaskSubtask" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TaskSubtask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskSubtask_taskId_idx" ON "TaskSubtask"("taskId");
CREATE INDEX "TaskSubtask_completed_idx" ON "TaskSubtask"("completed");

ALTER TABLE "TaskSubtask" ADD CONSTRAINT "TaskSubtask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
