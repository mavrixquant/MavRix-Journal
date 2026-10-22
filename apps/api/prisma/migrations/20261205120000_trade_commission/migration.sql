-- ---------------------------------------------------------------------------
-- Per-trade commission.
--
-- Before: commission was configured per-account (commissionMode + commissionValue)
--         and applied at read-time when computing net P&L.
-- After:  every trade carries its own optional `commission` value. Net P&L is
--         pnl − commission when a value is present (Live / Demo only). Backtest
--         trades keep the field for reference but it does not affect the R
--         metric.
--
-- Changes are ADDITIVE for trades and REMOVING for accounts. Accounts lose
-- the two columns (data discarded) since commission is now trade-scoped.
-- ---------------------------------------------------------------------------

-- 1. Add per-trade commission (nullable → existing rows keep commission = NULL)
ALTER TABLE "trades" ADD COLUMN "commission" DOUBLE PRECISION;

-- 2. Drop account-level commission config
ALTER TABLE "accounts" DROP COLUMN "commissionMode";
ALTER TABLE "accounts" DROP COLUMN "commissionValue";