// Canonical trade-ID generator — used by both API and web.
// Format: date_entryTime_exitTime_direction_symbol, non-alphanumerics → '_'.
export function generateTradeId(trade) {
  const { date, entryTime, exitTime, direction, symbol } = trade;
  const parts = [date, entryTime, exitTime, direction || '', symbol || '']
    .map(String)
    .map((s) => s.trim().replace(/[^a-zA-Z0-9]/g, '_'));
  return parts.join('_');
}
