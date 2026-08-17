-- AlterTable
ALTER TABLE "mainxp_day_plans" ADD COLUMN     "morningIntention" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "mainxp_habits" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "mainxp_routine_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "timeOfDay" TEXT NOT NULL DEFAULT 'morning',
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_routine_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_routine_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routineItemId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mainxp_routine_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mainxp_routine_items_userId_active_idx" ON "mainxp_routine_items"("userId", "active");

-- CreateIndex
CREATE INDEX "mainxp_routine_logs_userId_dayKey_idx" ON "mainxp_routine_logs"("userId", "dayKey");

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_routine_logs_routineItemId_dayKey_key" ON "mainxp_routine_logs"("routineItemId", "dayKey");

-- AddForeignKey
ALTER TABLE "mainxp_routine_items" ADD CONSTRAINT "mainxp_routine_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_routine_logs" ADD CONSTRAINT "mainxp_routine_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_routine_logs" ADD CONSTRAINT "mainxp_routine_logs_routineItemId_fkey" FOREIGN KEY ("routineItemId") REFERENCES "mainxp_routine_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
