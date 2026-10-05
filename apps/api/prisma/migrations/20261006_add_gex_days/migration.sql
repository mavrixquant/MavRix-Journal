-- CreateTable
CREATE TABLE "gex_days" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "levels" JSONB NOT NULL DEFAULT '[]',
    "converted" TEXT NOT NULL DEFAULT '',
    "levelCount" INTEGER NOT NULL DEFAULT 0,
    "blCount" INTEGER NOT NULL DEFAULT 0,
    "gexCount" INTEGER NOT NULL DEFAULT 0,
    "otherCount" INTEGER NOT NULL DEFAULT 0,
    "sourceTimezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gex_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gex_days_date_key" ON "gex_days"("date");

-- CreateIndex
CREATE INDEX "gex_days_date_idx" ON "gex_days"("date");