-- CreateTable
CREATE TABLE "mainxp_password_resets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_password_resets_tokenHash_key" ON "mainxp_password_resets"("tokenHash");

-- CreateIndex
CREATE INDEX "mainxp_password_resets_userId_createdAt_idx" ON "mainxp_password_resets"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "mainxp_password_resets" ADD CONSTRAINT "mainxp_password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
