// apps/api/src/lib/marketData/biquoteProvider.js
//
// Forex / metals provider backed by Biquote's MetaTrader 5 feed.
// Free, no API key. Docs: https://biquote.io/docs/
//
// Verified response shapes (from live diagnostic):
//
//   bq.ohlc(symbol, { interval, limit })  →  array of:
//     {
//       openTime: "2026-10-08T12:00:00Z",   // ISO string
//       open, high, low, close: number,
//       volume: 0,                           // always 0 for forex
//       tickVolume: 4796,                    // the real activity count
//       isOpen: boolean
//     }
//
//   bq.tick(symbol)  →  {
//     symbol, bid, ask, mid, last, volume, timestamp, source, exchange,
//     high, low, direction, dayDiffPercent, description, time, spread,
//     stale, quoteAgeSeconds, marketState, lastQuoteAt
//   }
//
// Normalized bar shape (same as yahooProvider):
//   { time: number|string, open, high, low, close, volume }

import Biquote from 'biquote';

import { HttpError } from '../../middleware/error.js';
import { enqueue } from './queue.js';
import { get as cacheGet, set as cacheSet } from './cache.js';

/* ------------------------------------------------------------------ */
/*  Client — lazy singleton                                           */
/* ------------------------------------------------------------------ */

let _client = null;

function getClient() {
  if (!_client) {
    _client = new Biquote();
  }
  return _client;
}

/* ------------------------------------------------------------------ */
/*  Interval / limit / TTL maps                                       */
/* ------------------------------------------------------------------ */

const BIQUOTE_INTERVAL_MAP = {
  '1m':  '1m',
  '5m':  '5m',
  '15m': '15m',
  '1h':  '1h',
  '4h':  '4h',
  '1d':  '1d',
};

const DEFAULT_LIMIT = {
  '1m':  500,
  '5m':  500,
  '15m': 500,
  '1h':  500,
  '4h':  500,
  '1d':  500,
};

const CACHE_TTL = {
  '1m':  60_000,
  '5m':  5 * 60_000,
  '15m': 15 * 60_000,
  '1h':  30 * 60_000,
  '4h':  60 * 60_000,
  '1d':  60 * 60_000,
};

/* ------------------------------------------------------------------ */
/*  Time normalization                                                */
/* ------------------------------------------------------------------ */

/**
 * Biquote returns `openTime` as an ISO 8601 string ("2026-10-08T12:00:00Z").
 * Convert to:
 *   - Unix seconds (integer) for intraday intervals — what lightweight-charts wants
 *   - "YYYY-MM-DD" for daily bars — what lightweight-charts wants for daily
 */
function normalizeTime(isoString, isDaily) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return null;

  if (isDaily) {
    return d.toISOString().slice(0, 10);
  }
  return Math.floor(d.getTime() / 1000);
}

/* ------------------------------------------------------------------ */
/*  Bar normalization                                                 */
/* ------------------------------------------------------------------ */

function normalizeBars(raw, interval) {
  if (!Array.isArray(raw) || raw.length === 0) {
    console.warn('[biquote] normalizeBars: empty or non-array response');
    return [];
  }

  const isDaily = interval === '1d';
  const bars = [];
  let dropped = 0;

  for (const c of raw) {
    if (!c || typeof c !== 'object') { dropped++; continue; }

    const time = normalizeTime(c.openTime, isDaily);

    const o = Number(c.open);
    const h = Number(c.high);
    const l = Number(c.low);
    const cl = Number(c.close);

    if (
      time == null ||
      !Number.isFinite(o) ||
      !Number.isFinite(h) ||
      !Number.isFinite(l) ||
      !Number.isFinite(cl)
    ) {
      dropped++;
      continue;
    }

    // `volume` is always 0 for forex; `tickVolume` is the real activity.
    const tickVol = Number(c.tickVolume);
    const realVol = Number(c.volume);
    const volume = Number.isFinite(tickVol) && tickVol > 0
      ? tickVol
      : (Number.isFinite(realVol) && realVol > 0 ? realVol : 0);

    bars.push({
      time,
      open: o,
      high: h,
      low: l,
      close: cl,
      volume,
    });
  }

  if (bars.length === 0) {
    console.warn(
      '[biquote] normalizeBars: dropped all %d records. First record: %s',
      dropped,
      JSON.stringify(raw[0]).slice(0, 400)
    );
  }

  // lightweight-charts requires ascending time order.
  bars.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

  return bars;
}

/* ------------------------------------------------------------------ */
/*  Public — bars                                                     */
/* ------------------------------------------------------------------ */

export async function getBars(symbol, interval) {
  const biqInterval = BIQUOTE_INTERVAL_MAP[interval];
  if (!biqInterval) {
    throw new HttpError(400, `Biquote: unsupported interval "${interval}"`);
  }

  const cacheKey = `biquote:${symbol}:${biqInterval}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const limit = DEFAULT_LIMIT[interval] || 500;

  let raw;
  try {
    raw = await enqueue(() =>
      getClient().ohlc(symbol, { interval: biqInterval, limit })
    );
  } catch (err) {
    throw new HttpError(
      502,
      `Biquote OHLC failed for ${symbol}: ${err.message || 'unknown error'}`
    );
  }

  const bars = normalizeBars(raw, interval);
  cacheSet(cacheKey, bars, CACHE_TTL[interval] || 60_000);
  return bars;
}

/* ------------------------------------------------------------------ */
/*  Public — quote                                                    */
/* ------------------------------------------------------------------ */

const QUOTE_TTL_MS = 30_000;

export async function getQuote(symbol) {
  const cacheKey = `biquote-quote:${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  let tick;
  try {
    tick = await enqueue(() => getClient().tick(symbol));
  } catch (err) {
    throw new HttpError(
      502,
      `Biquote tick failed for ${symbol}: ${err.message || 'unknown error'}`
    );
  }

  if (!tick || typeof tick !== 'object') {
    throw new HttpError(404, `Biquote returned no tick for ${symbol}`);
  }

  const mid = Number(tick.mid);
  if (!Number.isFinite(mid)) {
    throw new HttpError(404, `Biquote tick for ${symbol} has no price`);
  }

  const dayPct = Number(tick.dayDiffPercent);
  const high = Number(tick.high);
  const low = Number(tick.low);
  const volume = Number(tick.volume);

  // Derive previous close from current mid + dayDiffPercent:
  //   mid = prev * (1 + pct/100)  →  prev = mid / (1 + pct/100)
  let previousClose = null;
  let change = null;
  if (Number.isFinite(dayPct)) {
    const denom = 1 + dayPct / 100;
    if (denom !== 0) {
      previousClose = +(mid / denom).toFixed(6);
      change = +(mid - previousClose).toFixed(6);
    }
  }

  const quote = {
    symbol,
    price: mid,
    previousClose,
    change,
    changePct: Number.isFinite(dayPct) ? +dayPct.toFixed(4) : null,
    currency: null,
    exchange: tick.exchange || 'MT5',
    instrumentType: 'FOREX',
    dayHigh: Number.isFinite(high) ? high : null,
    dayLow: Number.isFinite(low) ? low : null,
    volume: Number.isFinite(volume) && volume > 0 ? volume : null,
    marketState: tick.marketState || null,
    updatedAt: Date.now(),
  };

  cacheSet(cacheKey, quote, QUOTE_TTL_MS);
  return quote;
}