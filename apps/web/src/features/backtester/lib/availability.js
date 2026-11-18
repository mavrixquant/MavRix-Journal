/* ============================================================================
   Data availability helpers. The server reports, per (symbol, interval), the
   contiguous window of bars that is stored and ready to replay.
   ============================================================================ */

/** rows: [{ symbol, interval, from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }] -> Map<symbol, Map<interval, {from,to}>> */
export function indexAvailability(rows) {
  const m = new Map();
  for (const r of rows || []) {
    if (!m.has(r.symbol)) m.set(r.symbol, new Map());
    m.get(r.symbol).set(r.interval, { from: r.from, to: r.to });
  }
  return m;
}

export const hasAnyData = (idx) => idx.size > 0;

/** Intervals that at least one symbol has data for. */
export function intervalsWithData(idx) {
  const out = new Set();
  for (const byInt of idx.values()) for (const k of byInt.keys()) out.add(k);
  return out;
}

/** Symbols that have data for `interval`. */
export function symbolsFor(idx, interval) {
  return [...idx.entries()].filter(([, byInt]) => byInt.has(interval)).map(([sym]) => sym).sort();
}

/** Window covered by EVERY listed symbol (intersection), or null when there is none. */
export function rangeFor(idx, interval, symbols) {
  if (!symbols?.length) return null;
  let min = null;
  let max = null;
  for (const sym of symbols) {
    const w = idx.get(sym)?.get(interval);
    if (!w) return null;
    if (min == null || w.from > min) min = w.from;
    if (max == null || w.to < max) max = w.to;
  }
  return min != null && max != null && min <= max ? { min, max } : null;
}
