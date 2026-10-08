// apps/api/src/lib/marketData/yahooProvider.js
//
// Fetches OHLCV bars + quotes from Yahoo Finance's v8 chart endpoint.
// 4h bars are aggregated from 1h server-side (Yahoo has no native 4h).

import { env } from '../../config/env.js';
import { HttpError } from '../../middleware/error.js';
import { enqueue } from './queue.js';
import { get as cacheGet, set as cacheSet } from './cache.js';

/* ------------------------------------------------------------------ */
/*  Interval / range mapping                                          */
/* ------------------------------------------------------------------ */

const YAHOO_INTERVAL_MAP = {
  '1m':  '1m',
  '5m':  '5m',
  '15m': '15m',
  '1h':  '1h',
  '4h':  '1h',   // aggregate → 4h buckets
  '1d':  '1d',
};

const DEFAULT_RANGE = {
  '1m':  '1d',
  '5m':  '5d',
  '15m': '1mo',
  '1h':  '3mo',
  '4h':  '6mo',
  '1d':  '1y',
};

/* ------------------------------------------------------------------ */
/*  Outbound fetch                                                    */
/* ------------------------------------------------------------------ */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchYahooChart(yahooSymbol, yahooInterval, range) {
  const url = new URL(
    `/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`,
    env.marketData.yahooBaseUrl
  );
  url.searchParams.set('interval', yahooInterval);
  url.searchParams.set('range', range);
  url.searchParams.set('includePrePost', 'false');
  url.searchParams.set('events', 'div,splits');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.marketData.yahooTimeoutMs);

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' },
      signal: controller.signal,
    });

    if (res.status === 429) {
      throw new HttpError(429, 'Yahoo Finance rate limit reached. Try again shortly.');
    }
    if (res.status === 404) {
      throw new HttpError(404, `Yahoo has no data for ${yahooSymbol}`);
    }
    if (!res.ok) {
      throw new HttpError(502, `Yahoo returned HTTP ${res.status}`);
    }

    const body = await res.json();

    if (body?.chart?.error) {
      const desc = body.chart.error.description || 'unknown error';
      throw new HttpError(400, `Yahoo: ${desc}`);
    }
    if (!body?.chart?.result?.length) {
      throw new HttpError(404, `Yahoo returned no series for ${yahooSymbol}`);
    }
    return body;
  } catch (err) {
    if (err?.name === 'AbortError') throw new HttpError(504, 'Yahoo request timed out');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/*  Bar normalization                                                 */
/* ------------------------------------------------------------------ */

function normalizeBars(raw, isDaily) {
  const result = raw.chart.result[0];
  const ts = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const open = q.open || [];
  const high = q.high || [];
  const low = q.low || [];
  const close = q.close || [];
  const volume = q.volume || [];

  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    const o = open[i], h = high[i], l = low[i], c = close[i];
    if (o == null || h == null || l == null || c == null) continue;
    bars.push({
      time: isDaily ? new Date(ts[i] * 1000).toISOString().slice(0, 10) : ts[i],
      open: o, high: h, low: l, close: c,
      volume: volume[i] == null ? 0 : volume[i],
    });
  }
  return bars;
}

/* ------------------------------------------------------------------ */
/*  4h aggregation from 1h bars                                       */
/* ------------------------------------------------------------------ */

function mergeBucket(bucket) {
  let high = -Infinity, low = Infinity, volume = 0;
  for (const b of bucket) {
    if (b.high > high) high = b.high;
    if (b.low < low) low = b.low;
    volume += b.volume || 0;
  }
  return {
    time: bucket[0].time,
    open: bucket[0].open,
    high, low,
    close: bucket[bucket.length - 1].close,
    volume,
  };
}

function aggregateTo4h(bars1h) {
  if (bars1h.length === 0) return [];
  const out = [];
  let bucket = [];
  let currentBucketKey = null;
  for (const b of bars1h) {
    const key = Math.floor(b.time / (4 * 3600));
    if (currentBucketKey === null) currentBucketKey = key;
    if (key !== currentBucketKey) {
      out.push(mergeBucket(bucket));
      bucket = [];
      currentBucketKey = key;
    }
    bucket.push(b);
  }
  if (bucket.length > 0) out.push(mergeBucket(bucket));
  return out;
}

/* ------------------------------------------------------------------ */
/*  Public — bars                                                     */
/* ------------------------------------------------------------------ */

export async function getBars(yahooSymbol, interval, rangeOverride) {
  const yahooInterval = YAHOO_INTERVAL_MAP[interval];
  if (!yahooInterval) {
    throw new HttpError(400, `Unsupported interval: ${interval}`);
  }

  const range = rangeOverride || DEFAULT_RANGE[interval] || '5d';
  const isDaily = interval === '1d';
  const is4h = interval === '4h';

  const cacheKey = `yahoo:${yahooSymbol}:${yahooInterval}:${range}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  let raw;
  let attempt = 0;
  while (true) {
    try {
      raw = await enqueue(() => fetchYahooChart(yahooSymbol, yahooInterval, range));
      break;
    } catch (err) {
      if (err?.status !== 429 || attempt >= 2) throw err;
      attempt += 1;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }

  const rawBars = normalizeBars(raw, isDaily);
  const bars = is4h ? aggregateTo4h(rawBars) : rawBars;

  const ttl = env.marketData.cacheTtl[interval] ?? 60_000;
  cacheSet(cacheKey, bars, ttl);
  return bars;
}

/* ------------------------------------------------------------------ */
/*  Public — quote                                                    */
/* ------------------------------------------------------------------ */

const QUOTE_TTL_MS = 30_000;

export async function getQuote(yahooSymbol) {
  const cacheKey = `yahoo-quote:${yahooSymbol}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const raw = await enqueue(() => fetchYahooChart(yahooSymbol, '1m', '1d'));
  const result = raw.chart.result[0];
  const meta = result?.meta || {};

  const price = meta.regularMarketPrice ?? null;
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? null;

  const quote = {
    symbol: meta.symbol ?? yahooSymbol,
    price,
    previousClose,
    change: price != null && previousClose != null ? +(price - previousClose).toFixed(4) : null,
    changePct: price != null && previousClose
      ? +(((price - previousClose) / previousClose) * 100).toFixed(3)
      : null,
    currency: meta.currency ?? null,
    exchange: meta.exchangeName ?? null,
    instrumentType: meta.instrumentType ?? null,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    volume: meta.regularMarketVolume ?? null,
    marketState: meta.marketState ?? null,
    updatedAt: Date.now(),
  };

  cacheSet(cacheKey, quote, QUOTE_TTL_MS);
  return quote;
}