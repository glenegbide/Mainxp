-- LE DOJO: physical training. Sessions are facts, the work-list is the craft,
-- the profile is the belt on the wall.

CREATE TABLE "mainxp_sport_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discipline" TEXT NOT NULL DEFAULT 'Jiu-jitsu brésilien',
    "grade" TEXT NOT NULL DEFAULT 'blanche',
    "stripes" INTEGER NOT NULL DEFAULT 0,
    "weeklyTarget" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mainxp_sport_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mainxp_sport_profiles_userId_key" ON "mainxp_sport_profiles"("userId");

ALTER TABLE "mainxp_sport_profiles" ADD CONSTRAINT "mainxp_sport_profiles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "mainxp_training_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "style" TEXT,
    "minutes" INTEGER NOT NULL,
    "rounds" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_training_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mainxp_training_sessions_userId_dayKey_idx" ON "mainxp_training_sessions"("userId", "dayKey");
CREATE INDEX "mainxp_training_sessions_userId_createdAt_idx" ON "mainxp_training_sessions"("userId", "createdAt");

ALTER TABLE "mainxp_training_sessions" ADD CONSTRAINT "mainxp_training_sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "mainxp_training_focus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'working',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "solidAt" TIMESTAMP(3),

    CONSTRAINT "mainxp_training_focus_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mainxp_training_focus_userId_status_idx" ON "mainxp_training_focus"("userId", "status");

ALTER TABLE "mainxp_training_focus" ADD CONSTRAINT "mainxp_training_focus_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
