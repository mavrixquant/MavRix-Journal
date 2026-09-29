-- CreateTable
CREATE TABLE "economic_events" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "eventId" TEXT,
    "date" TEXT NOT NULL,
    "timeUtc" TEXT NOT NULL,
    "dateTimeUtc" TIMESTAMP(3) NOT NULL,
    "period" TIMESTAMP(3),
    "countryCode" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "eventType" TEXT,
    "sector" TEXT,
    "unit" TEXT,
    "multiplier" TEXT,
    "digits" INTEGER,
    "actual" TEXT,
    "forecast" TEXT,
    "previous" TEXT,
    "revisedPrevious" TEXT,
    "revision" INTEGER,
    "timeMode" TEXT,
    "sourceUrl" TEXT,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "economic_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "economic_events_externalId_key" ON "economic_events"("externalId");

-- CreateIndex
CREATE INDEX "economic_events_dateTimeUtc_idx" ON "economic_events"("dateTimeUtc");

-- CreateIndex
CREATE INDEX "economic_events_currency_date_idx" ON "economic_events"("currency", "date");

-- CreateIndex
CREATE INDEX "economic_events_impact_date_idx" ON "economic_events"("impact", "date");

-- CreateIndex
CREATE INDEX "economic_events_eventId_idx" ON "economic_events"("eventId");
