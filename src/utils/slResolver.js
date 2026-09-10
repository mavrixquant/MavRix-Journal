// Single source of truth: "what SL (in POINTS) applies here?"
// 12.5 pt = 50 ticks → 1 pt = 4 ticks

const TICKS_PER_POINT = 4;
const FALLBACK_SL_POINTS = 12.5;

export function resolveSL(account) {
  // Backtest-only: Live/Demo fall back to default until we design them.
  if (!account || account.type !== 'Backtest') return FALLBACK_SL_POINTS;

  const raw = Number(account.slValue);
  if (!Number.isFinite(raw) || raw <= 0) return FALLBACK_SL_POINTS;

  return account.slUnit === 'ticks' ? raw / TICKS_PER_POINT : raw;
}

export const SL_CONST = { TICKS_PER_POINT, FALLBACK_SL_POINTS };