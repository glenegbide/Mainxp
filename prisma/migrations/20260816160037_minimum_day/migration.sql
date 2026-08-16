-- AlterTable
ALTER TABLE "mainxp_day_plans" ADD COLUMN     "minBodyDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minMindDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minProgressDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minimumDay" BOOLEAN NOT NULL DEFAULT false;
