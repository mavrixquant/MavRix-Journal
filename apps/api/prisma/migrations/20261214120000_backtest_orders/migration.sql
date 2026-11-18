-- ---------------------------------------------------------------------------
-- Backtester: pending limit / stop orders.
--
-- Purely additive — three new columns on "backtest_trades" (two nullable, one
-- with a default). Existing rows keep working: they read as filled market trades.
--
--   orderType  'market' | 'limit' | 'stop'
--   orderPrice the resting order price (NULL for market)
--   filledAt   when a pending order triggered (NULL while pending)
--
-- A row is a PENDING ORDER when  orderType <> 'market' AND filledAt IS NULL.
--
-- ROLLBACK (manual, if ever needed):
--   ALTER TABLE "backtest_trades" DROP COLUMN "filledAt";
--   ALTER TABLE "backtest_trades" DROP COLUMN "orderPrice";
--   ALTER TABLE "backtest_trades" DROP COLUMN "orderType";
-- ---------------------------------------------------------------------------

ALTER TABLE "backtest_trades"
  ADD COLUMN "orderType"  TEXT NOT NULL DEFAULT 'market',
  ADD COLUMN "orderPrice" DOUBLE PRECISION,
  ADD COLUMN "filledAt"   TIMESTAMP(3);
