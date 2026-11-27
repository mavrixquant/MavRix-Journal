import { getTimezoneOffsetSeconds } from '@/shared/trading/tradeTime';
import { BACKTEST_INTERVAL_SECONDS } from '@mavrix/shared';

export const INTERVAL_SECONDS = BACKTEST_INTERVAL_SECONDS;

const dayFmtCache = new Map();
const partsFmtCache = new Map();

function dayFmt(tz) {
  const key = tz || 'UTC';
  if (!dayFmtCache.has(key)) {
    let f;
    try {
      f = new Intl.DateTimeFormat('en-CA', { timeZone: key, year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      f = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
    }
    dayFmtCache.set(key, f);
  }
  return dayFmtCache.get(key);
}

function partsFmt(tz) {
  const key = tz || 'UTC';
  if (!partsFmtCache.has(key)) {
    let f;
    try {
      f = new Intl.DateTimeFormat('en-GB', {
        timeZone: key, hour: '2-digit', minute: '2-digit', hour12: false,
      });
    } catch {
      f = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false });
    }
    partsFmtCache.set(key, f);
  }
  return partsFmtCache.get(key);
}

export const toMs = (v) => (v instanceof Date ? v.getTime() : typeof v === 'number' ? v : Date.parse(v));

/** YYYY-MM-DD of an instant in the given IANA timezone. */
export function dayKey(v, tz) {
  const ms = toMs(v);
  if (!Number.isFinite(ms)) return null;
  return dayFmt(tz).format(new Date(ms));
}

/** HH:MM of an instant in the given IANA timezone. */
export function clockOf(v, tz) {
  const ms = toMs(v);
  if (!Number.isFinite(ms)) return '';
  return partsFmt(tz).format(new Date(ms));
}

export function fmtDateTime(v, tz) {
  const ms = toMs(v);
  if (!Number.isFinite(ms)) return '—';
  try {
    return new Date(ms).toLocaleString('en-US', {
      timeZone: tz || undefined,
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch {
    return new Date(ms).toISOString();
  }
}

export function fmtDate(v, tz) {
  const ms = toMs(v);
  if (!Number.isFinite(ms)) return '—';
  try {
    return new Date(ms).toLocaleDateString('en-US', {
      timeZone: tz || undefined, month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
}

/** Bar time (unix seconds | ISO | YYYY-MM-DD for 1d) -> unix seconds (UTC). */
export function barUtcSec(bar, interval) {
  const t = bar?.time;
  if (typeof t === 'number') return t;
  if (typeof t === 'string') {
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(t) ? `${t}T00:00:00Z` : t;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
  }
  if (t instanceof Date) return Math.floor(t.getTime() / 1000);
  return interval === '1d' ? null : null;
}

/**
 * Raw API bars -> clean, sorted, de-duplicated bars carrying `utc` seconds.
 * Same flat-bar filter as the main chart page.
 */
export function normalizeBars(rawBars, interval) {
  const seen = new Map();
  for (const b of rawBars) {
    const isFlat = b.open === b.high && b.high === b.low && b.low === b.close;
    if (isFlat && (!b.volume || Number(b.volume) === 0)) continue;
    const utc = barUtcSec(b, interval);
    if (utc == null) continue;
    seen.set(utc, {
      time: b.time,
      utc,
      open: Number(b.open),
      high: Number(b.high),
      low: Number(b.low),
      close: Number(b.close),
      volume: Number(b.volume) || 0,
    });
  }
  return [...seen.values()].sort((a, b) => a.utc - b.utc);
}

const snapToBarCache = new WeakMap();

/**
 * Latest index whose `utc` <= t (bars sorted ascending). -1 when none.
 * Memoized by bars identity (WeakMap key) to avoid recomputation.
 */
export function snapToBar(bars, t, key = 'utc') {
  if (!bars || !bars.length) return -1;

  // Check cache first - WeakMap uses object identity
  let cache = snapToBarCache.get(bars);
  if (cache && cache.t === t && cache.key === key) {
    return cache.result;
  }

  let lo = 0;
  let hi = bars.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (bars[mid][key] <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }

  // Store in cache
  snapToBarCache.set(bars, { t, key, result: ans });
  return ans;
}

export function displayOffsetFor(bars, interval, tz) {
  if (interval === '1d' || !bars.length) return 0;
  return getTimezoneOffsetSeconds(tz, bars[Math.floor(bars.length / 2)].utc);
}

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const daysBetweenIso = (from, to) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
