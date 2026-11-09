-- ---------------------------------------------------------------------------
-- Async import job tracking for /api/admin/market-data/import.
--
-- Purely additive — new table, new indexes, no existing data touched.
-- ---------------------------------------------------------------------------

CREATE TABLE "market_import_jobs" (
    "id"            TEXT          NOT NULL,
    "symbol"        TEXT          NOT NULL,
    "interval"      TEXT          NOT NULL,
    "fromTime"      TIMESTAMP(3)  NOT NULL,
    "toTime"        TIMESTAMP(3)  NOT NULL,
    "status"        TEXT          NOT NULL DEFAULT 'running',
    "totalChunks"   INTEGER       NOT NULL DEFAULT 0,
    "chunksDone"    INTEGER       NOT NULL DEFAULT 0,
    "fetched"       INTEGER       NOT NULL DEFAULT 0,
    "inserted"      INTEGER       NOT NULL DEFAULT 0,
    "lastError"     TEXT,
    "stopRequested" BOOLEAN       NOT NULL DEFAULT false,
    "startedById"   TEXT          NOT NULL,
    "startedAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt"    TIMESTAMP(3),

    CONSTRAINT "market_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "market_import_jobs_symbol_interval_status_idx"
  ON "market_import_jobs"("symbol", "interval", "status");

CREATE INDEX "market_import_jobs_startedAt_idx"
  ON "market_import_jobs"("startedAt");
