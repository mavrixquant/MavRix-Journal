// src/utils/slResolver.js
// Trade-level metric resolver: SL (in points) for Backtest R-mode,
// net PnL (in account currency) for Live/Demo money-mode.

export const TICKS_PER_POINT = 4;
export const FALLBACK_SL_POINTS = 12.5;

// Legacy shim: callers may pass a raw SL number where an account is expected.
// Builds a pseudo-account that forces the given fixed SL (Backtest, points).
function normalizeAccount(accountOrSL) {
  if (!accountOrSL) return null;
  if (typeof accountOrSL === 'object') return accountOrSL;
  if (typeof accountOrSL === 'number') {
    return {
      type: 'Backtest',
      slValue: accountOrSL,
      slUnit: 'points',
      _legacyFixedSL: accountOrSL,
    };
  }
  return null;
}

export function getMetricMode(accountOrSL) {
  if (accountOrSL === undefined || accountOrSL === null) return 'R';
  const acc = normalizeAccount(accountOrSL);
  return acc?.type === 'Backtest' ? 'R' : '$';
}

// Resolve the SL for a specific trade, in points.
// Priority: trade.slPoints → legacy fixed SL → account.slValue → 12.5 fallback.
export function getTradeSL(trade, accountOrSL) {
  const acc = normalizeAccount(accountOrSL);
  const stored = Number(trade?.slPoints);
  if (Number.isFinite(stored) && stored > 0) return stored;

  if (acc?._legacyFixedSL) return acc._legacyFixedSL;

  if (acc?.type === 'Backtest') {
    const raw = Number(acc.slValue);
    if (Number.isFinite(raw) && raw > 0) {
      return acc.slUnit === 'ticks' ? raw / TICKS_PER_POINT : raw;
    }
  }

  return FALLBACK_SL_POINTS;
}

// Commission for a single trade ($), from account config.
export function getTradeCommission(trade, accountOrSL) {
  const acc = normalizeAccount(accountOrSL);
  const mode = acc?.commissionMode || 'none';
  if (mode === 'none') return 0;
  const value = Number(acc?.commissionValue) || 0;
  if (value <= 0) return 0;
  if (mode === 'flat') return value;
  if (mode === 'per_contract') {
    const c = Number(trade?.contracts);
    if (!c || c <= 0) return 0;
    return value * c;
  }
  return 0;
}

// Net PnL for a single trade ($): gross pnl − commission.
export function getTradeNetPnl(trade, accountOrSL) {
  const gross = Number(trade?.pnl) || 0;
  const comm = getTradeCommission(trade, accountOrSL);
  return +(gross - comm).toFixed(4);
}

// Backward-compat: returns the account-level default SL (points).
// Kept for legacy callers; new engine uses getTradeSL per trade.
export function resolveSL(account) {
  if (!account || account.type !== 'Backtest') return FALLBACK_SL_POINTS;
  const raw = Number(account.slValue);
  if (!Number.isFinite(raw) || raw <= 0) return FALLBACK_SL_POINTS;
  return account.slUnit === 'ticks' ? raw / TICKS_PER_POINT : raw;
}

export const SL_CONST = { TICKS_PER_POINT, FALLBACK_SL_POINTS };