-- ---------------------------------------------------------------------------
-- Backtester v2: replay sessions + their trades.
--
-- Purely additive — two new tables, new indexes and foreign keys.
-- No existing table is altered; no existing data is touched.
--
-- ROLLBACK (manual, if ever needed):
--   DROP TABLE "backtest_trades";
--   DROP TABLE "backtest_sessions";
-- ---------------------------------------------------------------------------

CREATE TABLE "backtest_sessions" (
    "id"              TEXT             NOT NULL,
    "userId"          TEXT             NOT NULL,
    "name"            TEXT             NOT NULL,
    "type"            TEXT             NOT NULL DEFAULT 'standard',
    "currency"        TEXT             NOT NULL DEFAULT 'USD',
    "startingBalance" DOUBLE PRECISION NOT NULL,
    "fromDate"        TEXT             NOT NULL,
    "toDate"          TEXT             NOT NULL,
    "instruments"     TEXT[]           NOT NULL DEFAULT ARRAY['NQ']::TEXT[],
    "interval"        TEXT             NOT NULL DEFAULT '5m',
    "status"          TEXT             NOT NULL DEFAULT 'active',
    "propFirmConfig"  JSONB,
    "replayTime"      TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "backtest_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backtest_trades" (
    "id"         TEXT             NOT NULL,
    "sessionId"  TEXT             NOT NULL,
    "tradeId"    TEXT             NOT NULL,
    "symbol"     TEXT             NOT NULL,
    "side"       TEXT             NOT NULL,
    "entryTime"  TIMESTAMP(3)     NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "exitTime"   TIMESTAMP(3),
    "exitPrice"  DOUBLE PRECISION,
    "quantity"   DOUBLE PRECISION NOT NULL,
    "pnl"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slPoints"   DOUBLE PRECISION,
    "takeProfit" DOUBLE PRECISION,
    "stopLoss"   DOUBLE PRECISION,
    "commission" DOUBLE PRECISION,
    "exitReason" TEXT,
    "strategyId" TEXT,
    "notes"      TEXT             NOT NULL DEFAULT '',
    "dynamic"    JSONB            NOT NULL DEFAULT '{}'::jsonb,
    "createdAt"  TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "backtest_trades_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "backtest_sessions_userId_name_key"
  ON "backtest_sessions"("userId", "name");
CREATE INDEX "backtest_sessions_userId_status_idx"
  ON "backtest_sessions"("userId", "status");
CREATE INDEX "backtest_sessions_userId_updatedAt_idx"
  ON "backtest_sessions"("userId", "updatedAt");

CREATE UNIQUE INDEX "backtest_trades_sessionId_tradeId_key"
  ON "backtest_trades"("sessionId", "tradeId");
CREATE INDEX "backtest_trades_sessionId_idx"
  ON "backtest_trades"("sessionId");
CREATE INDEX "backtest_trades_sessionId_entryTime_idx"
  ON "backtest_trades"("sessionId", "entryTime");
CREATE INDEX "backtest_trades_strategyId_idx"
  ON "backtest_trades"("strategyId");

ALTER TABLE "backtest_sessions"
  ADD CONSTRAINT "backtest_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "backtest_trades"
  ADD CONSTRAINT "backtest_trades_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "backtest_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "backtest_trades"
  ADD CONSTRAINT "backtest_trades_strategyId_fkey"
  FOREIGN KEY ("strategyId") REFERENCES "strategies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
