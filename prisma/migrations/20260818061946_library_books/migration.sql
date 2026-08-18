-- CreateTable
CREATE TABLE "mainxp_books" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'reading',
    "notes" TEXT NOT NULL DEFAULT '',
    "lessons" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mainxp_books_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mainxp_books_userId_status_idx" ON "mainxp_books"("userId", "status");

-- AddForeignKey
ALTER TABLE "mainxp_books" ADD CONSTRAINT "mainxp_books_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mainxp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
