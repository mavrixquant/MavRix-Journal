-- Remove the leftover exitPrice column from trades.
--
-- exitPrice was half-wired. Add Trade never collected it for Backtest
-- (it sent null), and Journal P&L is authored directly (net = pnl -
-- commission). Old rows could hold the literal string "null", which
-- broke PATCH /api/trades/:id with a Prisma Float type error.
-- Nothing reads the column anymore, so drop it.

ALTER TABLE "trades" DROP COLUMN IF EXISTS "exitPrice";