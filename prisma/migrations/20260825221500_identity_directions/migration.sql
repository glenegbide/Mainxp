-- QUI JE DEVIENS: identity directions, proved by behavior.
CREATE TABLE "mainxp_identity_directions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "proofNote" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'quete',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_identity_directions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mainxp_identity_directions_userId_active_idx" ON "mainxp_identity_directions"("userId", "active");

ALTER TABLE "mainxp_identity_directions" ADD CONSTRAINT "mainxp_identity_directions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
