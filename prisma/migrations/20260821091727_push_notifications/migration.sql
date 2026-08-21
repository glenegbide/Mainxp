-- CreateTable
CREATE TABLE "mainxp_push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOkAt" TIMESTAMP(3),

    CONSTRAINT "mainxp_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mainxp_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deepLink" TEXT NOT NULL DEFAULT '/today',
    "dayKey" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "actedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "mainxp_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_push_subscriptions_endpoint_key" ON "mainxp_push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "mainxp_push_subscriptions_userId_idx" ON "mainxp_push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "mainxp_notifications_dedupeKey_key" ON "mainxp_notifications"("dedupeKey");

-- CreateIndex
CREATE INDEX "mainxp_notifications_userId_dayKey_idx" ON "mainxp_notifications"("userId", "dayKey");

-- AddForeignKey
ALTER TABLE "mainxp_push_subscriptions" ADD CONSTRAINT "mainxp_push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mainxp_notifications" ADD CONSTRAINT "mainxp_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
