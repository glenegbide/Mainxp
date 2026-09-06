-- ÉTAT (phase 3): morning frequencies, old→new patterns, and the Reset
-- (recorded as reset_completed events — no extra table needed).
ALTER TABLE "mainxp_day_plans" ADD COLUMN "frequencies" TEXT NOT NULL DEFAULT '';

CREATE TABLE "mainxp_patterns" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromLabel" TEXT NOT NULL,
    "toLabel" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT '',
    "oldResponse" TEXT NOT NULL DEFAULT '',
    "newResponse" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_patterns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mainxp_patterns_userId_active_idx" ON "mainxp_patterns"("userId", "active");

ALTER TABLE "mainxp_patterns" ADD CONSTRAINT "mainxp_patterns_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
