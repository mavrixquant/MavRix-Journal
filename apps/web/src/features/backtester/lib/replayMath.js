import { computeBacktestPnl } from '@mavrix/shared';

/* ============================================================================
   Replay maths — pure functions, no React.
   Everything here only ever looks at bars up to the replay cursor, so the
   chart can never leak future prices.
   ============================================================================ */

/**
 * Build the list of display candles for a timeframe.
 *  - view == base interval  -> 1:1 with base bars
 *  - view  > base interval  -> base bars aggregated into UTC-aligned buckets
 * Each entry remembers which base-bar indices it spans, so a bucket that is
 * still "forming" at the cursor can be rebuilt from bars <= cursor only.
 */
export function buildDisplayEntries(base, { viewSec, baseSec, offset, isDaily }) {
  const entries = [];
  if (!base.length) return entries;

  const shift = (utc, rawTime) => (isDaily ? rawTime : utc + offset);
  let prev = -Infinity;
  const push = (e) => {
    if (typeof e.time === 'number') {
      if (e.time <= prev) return; // DST fold: chart library rejects non-increasing times
      prev = e.time;
    }
    entries.push(e);
  };

  if (isDaily || !viewSec || viewSec <= baseSec) {
    for (let i = 0; i < base.length; i += 1) {
      const b = base[i];
      push({
        time: shift(b.utc, b.time),
        utc: b.utc,
        open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
        startIdx: i, endIdx: i,
      });
    }
    return entries;
  }

  let cur = null;
  for (let i = 0; i < base.length; i += 1) {
    const b = base[i];
    const bucket = Math.floor(b.utc / viewSec) * viewSec;
    if (!cur || cur.bucket !== bucket) {
      if (cur) push(finish(cur));
      cur = {
        bucket, utc: bucket, open: b.open, high: b.high, low: b.low, close: b.close,
        volume: b.volume, startIdx: i, endIdx: i,
      };
    } else {
      cur.high = Math.max(cur.high, b.high);
      cur.low = Math.min(cur.low, b.low);
      cur.close = b.close;
      cur.volume += b.volume;
      cur.endIdx = i;
    }
  }
  if (cur) push(finish(cur));
  return entries;

  function finish(c) {
    return {
      time: c.utc + offset,
      utc: c.utc,
      open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
      startIdx: c.startIdx, endIdx: c.endIdx,
    };
  }
}

/** Candles visible when the replay cursor sits on base-bar `idx`. */
export function displayUpTo(entries, base, idx) {
  if (idx < 0 || !entries.length) return [];

  // first entry whose endIdx > idx
  let lo = 0;
  let hi = entries.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (entries[mid].endIdx > idx) hi = mid; else lo = mid + 1;
  }
  const completed = entries.slice(0, lo);
  const forming = entries[lo];

  if (forming && forming.startIdx <= idx) {
    let high = -Infinity;
    let low = Infinity;
    let volume = 0;
    for (let i = forming.startIdx; i <= idx; i += 1) {
      const b = base[i];
      if (b.high > high) high = b.high;
      if (b.low < low) low = b.low;
      volume += b.volume;
    }
    completed.push({
      time: forming.time,
      utc: forming.utc,
      open: base[forming.startIdx].open,
      high, low,
      close: base[idx].close,
      volume,
      startIdx: forming.startIdx,
      endIdx: idx,
    });
  }
  return completed;
}

/**
 * Does a bar's high/low envelope contain the given price?
 * Returns true if price is within [low, high] range of the bar.
 */
export function barTouchesLevel(price, bar) {
  if (price == null) return false;
  return bar.low <= price && price <= bar.high;
}

/**
 * Did this bar touch the position's SL/TP?
 * Conservative rules:
 *  - both touched in the same bar  -> the stop wins
 *  - the bar gaps through a level  -> fill at the open (worse for SL, better for TP)
 */
export function checkFill(position, bar) {
  const long = position.side === 'long';
  const sl = Number(position.stopLoss) || null;
  const tp = Number(position.takeProfit) || null;

  let slHit = false;
  let tpHit = false;
  if (sl != null) slHit = long ? bar.low <= sl : bar.high >= sl;
  if (tp != null) tpHit = long ? bar.high >= tp : bar.low <= tp;

  if (slHit) {
    const gap = long ? bar.open < sl : bar.open > sl;
    return { price: gap ? bar.open : sl, reason: 'sl' };
  }
  if (tpHit) {
    const gap = long ? bar.open > tp : bar.open < tp;
    return { price: gap ? bar.open : tp, reason: 'tp' };
  }
  return null;
}

/** Floating P&L (gross, before commission) of an open position at `price`. */
export function unrealisedPnl(position, price) {
  if (!position || price == null) return 0;
  return computeBacktestPnl({
    side: position.side,
    entryPrice: position.entryPrice,
    exitPrice: price,
    quantity: position.quantity,
    symbol: position.symbol,
  });
}

export function unrealisedPoints(position, price) {
  if (!position || price == null) return 0;
  const dir = position.side === 'short' ? -1 : 1;
  return +((price - position.entryPrice) * dir).toFixed(6);
}

/** Resolve SL/TP inputs (price or points) into absolute prices. */
export function resolveBrackets({ side, entry, sl, tp, mode }) {
  const long = side === 'long';
  const toNum = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
  const s = toNum(sl);
  const t = toNum(tp);
  if (mode === 'price') return { stopLoss: s, takeProfit: t };
  return {
    stopLoss: s != null && s > 0 ? +(long ? entry - s : entry + s).toFixed(6) : null,
    takeProfit: t != null && t > 0 ? +(long ? entry + t : entry - t).toFixed(6) : null,
  };
}

export function validateBrackets({ side, entry, stopLoss, takeProfit }) {
  const long = side === 'long';
  if (stopLoss != null && (long ? stopLoss >= entry : stopLoss <= entry)) {
    return `Stop loss must be ${long ? 'below' : 'above'} the entry price.`;
  }
  if (takeProfit != null && (long ? takeProfit <= entry : takeProfit >= entry)) {
    return `Take profit must be ${long ? 'above' : 'below'} the entry price.`;
  }
  return null;
}

export const newTradeId = () =>
  `bt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
