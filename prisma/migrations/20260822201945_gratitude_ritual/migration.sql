-- Gratitude 01-10 ritual: morning and night are distinct, ordered lists.
-- Both store; the XP listener still pays at most once per day (same
-- idempotency key as before) - this migration changes storage, not rewards.
ALTER TABLE "mainxp_gratitude_entries" ADD COLUMN "period" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "mainxp_gratitude_entries" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Existing rows all become period='free' position=0; rows sharing a day must
-- not collide with the new unique constraint, so give them distinct positions.
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId", "dayKey" ORDER BY "createdAt") - 1 AS rn
  FROM "mainxp_gratitude_entries"
)
UPDATE "mainxp_gratitude_entries" g SET "position" = numbered.rn
FROM numbered WHERE g.id = numbered.id;

CREATE UNIQUE INDEX "mainxp_gratitude_entries_userId_dayKey_period_position_key"
  ON "mainxp_gratitude_entries"("userId", "dayKey", "period", "position");
