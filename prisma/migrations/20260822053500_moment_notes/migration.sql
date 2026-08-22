-- AlterTable
ALTER TABLE "mainxp_gratitude_entries" ADD COLUMN     "note" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "mainxp_habit_logs" ADD COLUMN     "note" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "mainxp_non_negotiable_logs" ADD COLUMN     "note" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "mainxp_routine_logs" ADD COLUMN     "note" TEXT NOT NULL DEFAULT '';
