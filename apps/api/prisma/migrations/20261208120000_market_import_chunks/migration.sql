-- ---------------------------------------------------------------------------
-- Per-chunk tracking for market data import jobs.
--
-- Before: a job only stored aggregate counters (chunksDone, fetched, inserted).
-- After:  every chunk is a row so the admin UI can show a live per-chunk log.
--
-- Purely additive — new table, new indexes, no existing data touched.
-- ---------------------------------------------------------------------------

CREATE TABLE "market_import_chunks" (
    "id"         TEXT NOT NULL,
    "jobId"      TEXT NOT NULL,
    "index"      INTEGER NOT NULL,
    "fromTime"   TIMESTAMP(3) NOT NULL,
    "toTime"     TIMESTAMP(3) NOT NULL,
    "status"     TEXT NOT NULL DEFAULT 'pending',
    "attempt"    INTEGER NOT NULL DEFAULT 0,
    "fetched"    INTEGER NOT NULL DEFAULT 0,
    "inserted"   INTEGER NOT NULL DEFAULT 0,
    "error"      TEXT,
    "startedAt"  TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_import_chunks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "market_import_chunks_jobId_index_idx"
  ON "market_import_chunks"("jobId", "index");

CREATE INDEX "market_import_chunks_jobId_status_idx"
  ON "market_import_chunks"("jobId", "status");

ALTER TABLE "market_import_chunks"
  ADD CONSTRAINT "market_import_chunks_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "market_import_jobs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;