ALTER TABLE "ProjectLead" RENAME TO "BacklogSlateItem";

ALTER TABLE "BacklogSlateItem" RENAME CONSTRAINT "ProjectLead_pkey" TO "BacklogSlateItem_pkey";

ALTER INDEX "ProjectLead_externalId_key" RENAME TO "BacklogSlateItem_externalId_key";
ALTER INDEX "ProjectLead_lane_idx" RENAME TO "BacklogSlateItem_lane_idx";
ALTER INDEX "ProjectLead_genre_idx" RENAME TO "BacklogSlateItem_genre_idx";
ALTER INDEX "ProjectLead_urgencyLabel_idx" RENAME TO "BacklogSlateItem_urgencyLabel_idx";
ALTER INDEX "ProjectLead_rightsStatus_idx" RENAME TO "BacklogSlateItem_rightsStatus_idx";
ALTER INDEX "ProjectLead_nextActionStatus_idx" RENAME TO "BacklogSlateItem_nextActionStatus_idx";
ALTER INDEX "ProjectLead_owner_idx" RENAME TO "BacklogSlateItem_owner_idx";
ALTER INDEX "ProjectLead_scriptStatus_idx" RENAME TO "BacklogSlateItem_scriptStatus_idx";
ALTER INDEX "ProjectLead_promotedProjectId_idx" RENAME TO "BacklogSlateItem_promotedProjectId_idx";
ALTER INDEX "ProjectLead_deletedAt_idx" RENAME TO "BacklogSlateItem_deletedAt_idx";

ALTER TABLE "BacklogSlateItem" RENAME CONSTRAINT "ProjectLead_promotedProjectId_fkey" TO "BacklogSlateItem_promotedProjectId_fkey";
