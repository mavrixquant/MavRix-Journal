-- ---------------------------------------------------------------------------
-- GEX symbol support.
--
-- Before: one GEX day row per calendar date (date was UNIQUE).
-- After:  one GEX day row per (date, symbol). NQ and ES can share a date.
--
-- Changes:
--   1. ADD COLUMN symbol TEXT NOT NULL DEFAULT 'NQ'
--      → existing rows backfill to 'NQ', no data loss.
--   2. DROP the single-column unique index on date.
--   3. CREATE a composite unique on (date, symbol).
--   4. CREATE an index on (symbol, date) — the shape of every query.
--
-- Rollback (manual — Prisma migrations are forward-only):
--   DROP INDEX IF EXISTS "gex_days_symbol_date_idx";
--   DROP INDEX IF EXISTS "gex_days_date_symbol_key";
--   ALTER TABLE "gex_days" DROP COLUMN "symbol";
--   CREATE UNIQUE INDEX "gex_days_date_key" ON "gex_days"("date");
-- ---------------------------------------------------------------------------

-- 1. symbol column (defaults to 'NQ' for all existing rows)
ALTER TABLE "gex_days" ADD COLUMN "symbol" TEXT NOT NULL DEFAULT 'NQ';

-- 2. Drop the old single-column unique index
DROP INDEX IF EXISTS "gex_days_date_key";

-- 3. Composite unique — one row per (date, symbol)
CREATE UNIQUE INDEX "gex_days_date_symbol_key"
  ON "gex_days"("date", "symbol");

-- 4. Lookup index — powers "list days for symbol, newest first"
CREATE INDEX "gex_days_symbol_date_idx"
  ON "gex_days"("symbol", "date");