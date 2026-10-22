// ============================================================================
// SL / metric helpers.
//
// Commission is per-trade (optional). Net P&L = pnl - commission for $ mode.
// Backtest R-mode requires slPoints on EVERY trade -- there is no account-level
// fallback. A missing SL yields R-mode "invalid" and the trade is excluded
// from R statistics (see filters.js -> outcomeFor).
// ============================================================================

export const TICKS_PER_POINT = 4;

function normalizeAccount(accountOrSL) {
  if (!accountOrSL) return null;
  if (typeof accountOrSL === 'object') return accountOrSL;
  if (typeof accountOrSL === 'number') {
    return { type: 'Backtest', _legacyFixedSL: accountOrSL };
  }
  return null;
}

export function getMetricMode(accountOrSL) {
  if (accountOrSL === undefined || accountOrSL === null) return 'R';
  const acc = normalizeAccount(accountOrSL);
  return acc?.type === 'Backtest' ? 'R' : '$';
}

// Returns the trade's SL in POINTS, or null if not set.
// There is NO account-level fallback.
export function getTradeSL(trade, _accountOrSL) {
  const stored = Number(trade?.slPoints);
  if (Number.isFinite(stored) && stored > 0) return stored;
  return null;
}

export function getTradeCommission(trade, _accountOrSL) {
  const raw = Number(trade?.commission);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw;
}

export function getTradeNetPnl(trade, _accountOrSL) {
  const gross = Number(trade?.pnl) || 0;
  const comm = getTradeCommission(trade);
  return +(gross - comm).toFixed(4);
}

export const SL_CONST = { TICKS_PER_POINT };