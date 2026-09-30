
-- ---------------------------------------------------------------------------
-- Trade model redesign.
--
-- 1. mae / mfe become nullable (they were NOT NULL DEFAULT 0). Live/Demo
--    trades no longer carry these fields.
-- 2. contracts (INTEGER) is renamed to quantity (DOUBLE PRECISION) and
--    widened to allow fractional position sizes.
-- 3. Three new nullable columns for the Journal (Live/Demo) shape:
--    entryPrice, takeProfit, stopLoss.
--
-- All changes are additive or relax existing constraints — no data loss.
-- ---------------------------------------------------------------------------

-- 1. mae / mfe — drop default + NOT NULL
ALTER TABLE "trades" ALTER COLUMN "mae" DROP DEFAULT;
ALTER TABLE "trades" ALTER COLUMN "mae" DROP NOT NULL;

ALTER TABLE "trades" ALTER COLUMN "mfe" DROP DEFAULT;
ALTER TABLE "trades" ALTER COLUMN "mfe" DROP NOT NULL;

-- 2. contracts → quantity (INTEGER → DOUBLE PRECISION)
ALTER TABLE "trades" RENAME COLUMN "contracts" TO "quantity";
ALTER TABLE "trades" ALTER COLUMN "quantity" TYPE DOUBLE PRECISION;

-- 3. Journal (Live/Demo) fields
ALTER TABLE "trades" ADD COLUMN "entryPrice" DOUBLE PRECISION;
ALTER TABLE "trades" ADD COLUMN "takeProfit" DOUBLE PRECISION;
ALTER TABLE "trades" ADD COLUMN "stopLoss"   DOUBLE PRECISION;