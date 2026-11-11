-- ---------------------------------------------------------------------------
-- Re-introduce trade exitPrice for Live/Demo trades.
--
-- Earlier migrations (20261206130000, 20261206140000) added then removed this
-- column because the Backtest flow never populated it and legacy rows held
-- the literal string "null" causing Prisma Float type errors.
--
-- With the redesigned Journal flow, Exit Price is a first-class field
-- collected alongside Entry Price on Live/Demo trades. Backtest trades leave
-- it NULL. Backend strips it from Backtest payloads at the service layer, so
-- the "string null" failure mode cannot recur.
--
-- Additive only - existing rows are untouched and default to NULL.
-- ---------------------------------------------------------------------------

ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "exitPrice" DOUBLE PRECISION;