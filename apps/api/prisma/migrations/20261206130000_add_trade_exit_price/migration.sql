-- Optional exit price on a trade. Used by the Live/Demo journal flow to
-- let users record entry -> exit prices and auto-compute P&L. Backtest
-- trades do not use this field.
ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "exitPrice" DOUBLE PRECISION;