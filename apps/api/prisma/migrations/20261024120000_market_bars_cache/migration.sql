CREATE TABLE IF NOT EXISTS "market_bars" (
  "id"        TEXT            NOT NULL,
  "symbol"    TEXT            NOT NULL,
  "interval"  TEXT            NOT NULL,
  "time"      TIMESTAMP(3)    NOT NULL,
  "open"      DOUBLE PRECISION NOT NULL,
  "high"      DOUBLE PRECISION NOT NULL,
  "low"       DOUBLE PRECISION NOT NULL,
  "close"     DOUBLE PRECISION NOT NULL,
  "volume"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "provider"  TEXT            NOT NULL,
  "fetchedAt" TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_bars_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "market_bars_symbol_interval_time_key"
  ON "market_bars"("symbol", "interval", "time");

CREATE INDEX IF NOT EXISTS "market_bars_symbol_interval_time_idx"
  ON "market_bars"("symbol", "interval", "time");

CREATE TABLE IF NOT EXISTS "market_bar_coverage" (
  "id"             TEXT          NOT NULL,
  "symbol"         TEXT          NOT NULL,
  "interval"       TEXT          NOT NULL,
  "provider"       TEXT          NOT NULL,
  "providerSymbol" TEXT          NOT NULL,
  "fromTime"       TIMESTAMP(3)  NOT NULL,
  "toTime"         TIMESTAMP(3)  NOT NULL,
  "lastFetchedAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError"      TEXT,
  "backoffUntil"   TIMESTAMP(3),
  CONSTRAINT "market_bar_coverage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "market_bar_coverage_symbol_interval_key"
  ON "market_bar_coverage"("symbol", "interval");