-- DIRECTION: one Season at a time, «Pas maintenant» for everything else,
-- and every goal can name its bottleneck and its leading input.

CREATE TABLE "mainxp_seasons" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDay" TEXT NOT NULL,
    "endDay" TEXT NOT NULL,
    "primaryGoalId" TEXT,
    "supportNote" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "mainxp_seasons_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mainxp_seasons_userId_status_idx" ON "mainxp_seasons"("userId", "status");

ALTER TABLE "mainxp_seasons" ADD CONSTRAINT "mainxp_seasons_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "mainxp_not_now" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_not_now_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mainxp_not_now_userId_createdAt_idx" ON "mainxp_not_now"("userId", "createdAt");

ALTER TABLE "mainxp_not_now" ADD CONSTRAINT "mainxp_not_now_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mainxp_goals" ADD COLUMN "bottleneck" TEXT NOT NULL DEFAULT '';
ALTER TABLE "mainxp_goals" ADD COLUMN "leadingInput" TEXT NOT NULL DEFAULT '';
