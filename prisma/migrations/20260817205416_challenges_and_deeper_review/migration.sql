-- AlterTable
ALTER TABLE "mainxp_day_plans" ADD COLUMN     "reviewAlignment" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "reviewFeelings" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "mainxp_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "durationDays" INTEGER NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "unitLabel" TEXT NOT NULL DEFAULT 'jours',
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "source" TEXT NOT NULL DEFAULT 'coach',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_challenge_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,

    CONSTRAINT "mainxp_challenge_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mainxp_challenges_userId_status_idx" ON "mainxp_challenges"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_challenge_logs_challengeId_dayKey_key" ON "mainxp_challenge_logs"("challengeId", "dayKey");

-- AddForeignKey
ALTER TABLE "mainxp_challenges" ADD CONSTRAINT "mainxp_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_challenge_logs" ADD CONSTRAINT "mainxp_challenge_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_challenge_logs" ADD CONSTRAINT "mainxp_challenge_logs_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "mainxp_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
