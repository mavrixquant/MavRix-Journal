// apps/web/src/shared/trading/tradeId.js
//
// Canonical trade-ID generator for the web app.
// Format: date_entryTime_exitTime_direction_symbol, non-alphanumerics → '_'.
//
// Backend mirrors this in packages/shared/src/tradeId.js. Keep both in sync.

export function generateTradeId(trade) {
  const { date, entryTime, exitTime, direction, symbol } = trade;
  const parts = [date, entryTime, exitTime, direction || '', symbol || '']
    .map(String)
    .map((s) => s.trim().replace(/[^a-zA-Z0-9]/g, '_'));
  return parts.join('_');
}