

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

export function getTradeCommission(trade, accountOrSL) {
  const acc = normalizeAccount(accountOrSL);
  const mode = acc?.commissionMode || 'none';
  if (mode === 'none') return 0;
  const value = Number(acc?.commissionValue) || 0;
  if (value <= 0) return 0;
  if (mode === 'flat') return value;
  if (mode === 'per_contract') {
    const q = Number(trade?.quantity);
    if (!q || q <= 0) return 0;
    return value * q;
  }
  return 0;
}

export function getTradeNetPnl(trade, accountOrSL) {
  const gross = Number(trade?.pnl) || 0;
  const comm = getTradeCommission(trade, accountOrSL);
  return +(gross - comm).toFixed(4);
}

export function resolveSL(account) {
  if (!account || account.type !== 'Backtest') return FALLBACK_SL_POINTS;
  const raw = Number(account.slValue);
  if (!Number.isFinite(raw) || raw <= 0) return FALLBACK_SL_POINTS;
  return account.slUnit === 'ticks' ? raw / TICKS_PER_POINT : raw;
}

export const SL_CONST = { TICKS_PER_POINT, FALLBACK_SL_POINTS };