// ============================================================================
// SL / metric helpers.
//
// Commission is now a per-trade field (optional). Net P&L = pnl − commission.
// Backtest accounts keep R-mode scoring; commission is stored for reference
// but does not affect the R metric.
// ============================================================================

export const TICKS_PER_POINT = 4;
export const FALLBACK_SL_POINTS = 12.5;

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

/**
 * Commission on a trade. Returns 0 if not provided.
 * Accepts and ignores a second arg for backward-compat with old call sites
 * that used to pass the account object.
 */
export function getTradeCommission(trade, _accountOrSL) {
  const raw = Number(trade?.commission);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw;
}

/**
 * Net P&L = gross pnl − commission.
 * Only meaningful in $ mode (Live / Demo). R mode ignores this for scoring.
 */
export function getTradeNetPnl(trade, _accountOrSL) {
  const gross = Number(trade?.pnl) || 0;
  const comm = getTradeCommission(trade);
  return +(gross - comm).toFixed(4);
}

export function resolveSL(account) {
  if (!account || account.type !== 'Backtest') return FALLBACK_SL_POINTS;
  const raw = Number(account.slValue);
  if (!Number.isFinite(raw) || raw <= 0) return FALLBACK_SL_POINTS;
  return account.slUnit === 'ticks' ? raw / TICKS_PER_POINT : raw;
}

export const SL_CONST = { TICKS_PER_POINT, FALLBACK_SL_POINTS };