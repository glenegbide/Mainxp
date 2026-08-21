/*
  Warnings:

  - You are about to drop the column `actedAt` on the `mainxp_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `deepLink` on the `mainxp_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `dismissedAt` on the `mainxp_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `kind` on the `mainxp_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `lastOkAt` on the `mainxp_push_subscriptions` table. All the data in the column will be lost.
  - Added the required column `mode` to the `mainxp_notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `mainxp_notifications` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "mainxp_push_subscriptions_userId_idx";

-- AlterTable
ALTER TABLE "mainxp_notifications" DROP COLUMN "actedAt",
DROP COLUMN "deepLink",
DROP COLUMN "dismissedAt",
DROP COLUMN "kind",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "evidence" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "mode" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'QUEUED',
ADD COLUMN     "suppressedReason" TEXT,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "urgency" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "url" TEXT NOT NULL DEFAULT '/today',
ALTER COLUMN "sentAt" DROP NOT NULL,
ALTER COLUMN "sentAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "mainxp_push_subscriptions" DROP COLUMN "lastOkAt",
ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "failureCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastSuccessAt" TIMESTAMP(3),
ADD COLUMN     "platform" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "mainxp_users" ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "notifDailyCap" INTEGER,
ADD COLUMN     "pushEnabledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "mainxp_notifications_userId_type_createdAt_idx" ON "mainxp_notifications"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "mainxp_push_subscriptions_userId_disabledAt_idx" ON "mainxp_push_subscriptions"("userId", "disabledAt");
