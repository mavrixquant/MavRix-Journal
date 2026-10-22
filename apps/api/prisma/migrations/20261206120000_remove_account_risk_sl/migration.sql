-- Remove risk and SL config from accounts.
-- Accounts are now pure capital containers.
-- SL is a per-trade field only (required for Backtest).

ALTER TABLE "accounts" DROP COLUMN IF EXISTS "riskType";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "riskValue";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "riskUnit";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "slValue";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "slUnit";