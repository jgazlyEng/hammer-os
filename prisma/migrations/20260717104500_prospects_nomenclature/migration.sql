ALTER TABLE "BacklogSlateItem" RENAME TO "Prospect";

ALTER TABLE "Prospect" RENAME CONSTRAINT "BacklogSlateItem_pkey" TO "Prospect_pkey";

ALTER INDEX "BacklogSlateItem_externalId_key" RENAME TO "Prospect_externalId_key";
ALTER INDEX "BacklogSlateItem_lane_idx" RENAME TO "Prospect_lane_idx";
ALTER INDEX "BacklogSlateItem_genre_idx" RENAME TO "Prospect_genre_idx";
ALTER INDEX "BacklogSlateItem_urgencyLabel_idx" RENAME TO "Prospect_urgencyLabel_idx";
ALTER INDEX "BacklogSlateItem_rightsStatus_idx" RENAME TO "Prospect_rightsStatus_idx";
ALTER INDEX "BacklogSlateItem_nextActionStatus_idx" RENAME TO "Prospect_nextActionStatus_idx";
ALTER INDEX "BacklogSlateItem_owner_idx" RENAME TO "Prospect_owner_idx";
ALTER INDEX "BacklogSlateItem_scriptStatus_idx" RENAME TO "Prospect_scriptStatus_idx";
ALTER INDEX "BacklogSlateItem_promotedProjectId_idx" RENAME TO "Prospect_promotedProjectId_idx";
ALTER INDEX "BacklogSlateItem_deletedAt_idx" RENAME TO "Prospect_deletedAt_idx";

ALTER TABLE "Prospect" RENAME CONSTRAINT "BacklogSlateItem_promotedProjectId_fkey" TO "Prospect_promotedProjectId_fkey";
