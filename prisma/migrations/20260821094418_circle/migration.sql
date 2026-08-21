-- CreateTable
CREATE TABLE "mainxp_circle_invites" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_circle_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_circle_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "shareElan" BOOLEAN NOT NULL DEFAULT false,
    "shareMainQuest" BOOLEAN NOT NULL DEFAULT false,
    "shareChallenges" BOOLEAN NOT NULL DEFAULT false,
    "shareWeekly" BOOLEAN NOT NULL DEFAULT false,
    "goalIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "challengeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mainxp_circle_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_blocks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_encouragements" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'support',
    "dayKey" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_encouragements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_circle_invites_token_key" ON "mainxp_circle_invites"("token");

-- CreateIndex
CREATE INDEX "mainxp_circle_invites_inviterId_createdAt_idx" ON "mainxp_circle_invites"("inviterId", "createdAt");

-- CreateIndex
CREATE INDEX "mainxp_circle_links_partnerId_status_idx" ON "mainxp_circle_links"("partnerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_circle_links_userId_partnerId_key" ON "mainxp_circle_links"("userId", "partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_blocks_userId_blockedId_key" ON "mainxp_blocks"("userId", "blockedId");

-- CreateIndex
CREATE INDEX "mainxp_encouragements_toId_createdAt_idx" ON "mainxp_encouragements"("toId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_encouragements_fromId_toId_dayKey_kind_key" ON "mainxp_encouragements"("fromId", "toId", "dayKey", "kind");

-- AddForeignKey
ALTER TABLE "mainxp_circle_invites" ADD CONSTRAINT "mainxp_circle_invites_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_circle_invites" ADD CONSTRAINT "mainxp_circle_invites_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "mainxp_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_circle_links" ADD CONSTRAINT "mainxp_circle_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_circle_links" ADD CONSTRAINT "mainxp_circle_links_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_blocks" ADD CONSTRAINT "mainxp_blocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_blocks" ADD CONSTRAINT "mainxp_blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_encouragements" ADD CONSTRAINT "mainxp_encouragements_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_encouragements" ADD CONSTRAINT "mainxp_encouragements_toId_fkey" FOREIGN KEY ("toId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
