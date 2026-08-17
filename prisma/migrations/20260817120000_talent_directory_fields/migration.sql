ALTER TABLE "Contact" ADD COLUMN "isTalent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Contact" ADD COLUMN "talentAgency" TEXT;
ALTER TABLE "Contact" ADD COLUMN "talentCredits" TEXT;
ALTER TABLE "Contact" ADD COLUMN "talentGenre" TEXT;
ALTER TABLE "Contact" ADD COLUMN "talentRole" TEXT;
ALTER TABLE "Contact" ADD COLUMN "talentMetWith" TEXT;
ALTER TABLE "Contact" ADD COLUMN "talentBased" TEXT;
CREATE INDEX "Contact_isTalent_idx" ON "Contact"("isTalent");
