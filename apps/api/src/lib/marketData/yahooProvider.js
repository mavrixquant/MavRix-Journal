import { env } from '../../config/env.js';
import { HttpError } from '../../middleware/error.js';
import { enqueue } from './queue.js';
import { get as cacheGet, set as cacheSet } from './cache.js';

const YAHOO_INTERVAL_MAP = { '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '1h', '1d': '1d' };
const LEGACY_DEFAULT_RANGE = { '1m': '1d', '5m': '5d', '15m': '1mo', '1h': '3mo', '4h': '6mo', '1d': '1y' };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchChart(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.marketData.yahooTimeoutMs);
  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' },
      signal: controller.signal,
    });
    if (res.status === 429) throw new HttpError(429, 'Yahoo rate limit reached');
    if (res.status === 404) throw new HttpError(404, 'Yahoo: no data');
    if (!res.ok) throw new HttpError(502, `Yahoo HTTP ${res.status}`);
    const body = await res.json();
    if (body?.chart?.error) throw new HttpError(400, `Yahoo: ${body.chart.error.description}`);
    if (!body?.chart?.result?.length) throw new HttpError(404, 'Yahoo no series');
    return body;
  } catch (err) {
    if (err?.name === 'AbortError') throw new HttpError(504, 'Yahoo timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeBars(raw, isDaily) {
  const result = raw.chart.result[0];
  const ts = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
    if (o == null || h == null || l == null || c == null) continue;
    bars.push({
      time: isDaily ? new Date(ts[i] * 1000).toISOString().slice(0, 10) : ts[i],
      open: o, high: h, low: l, close: c, volume: q.volume?.[i] || 0,
    });
  }
  return bars;
}

function mergeBucket(bucket) {
  let high = -Infinity, low = Infinity, volume = 0;
  for (const b of bucket) {
    if (b.high > high) high = b.high;
    if (b.low < low) low = b.low;
    volume += b.volume || 0;
  }
  return { time: bucket[0].time, open: bucket[0].open, high, low, close: bucket[bucket.length - 1].close, volume };
}

function aggregateTo4h(bars1h) {
  if (bars1h.length === 0) return [];
  const out = [];
  let bucket = [], key = null;
  for (const b of bars1h) {
    const k = Math.floor(b.time / (4 * 3600));
    if (key === null) key = k;
    if (k !== key) { out.push(mergeBucket(bucket)); bucket = []; key = k; }
    bucket.push(b);
  }
  if (bucket.length) out.push(mergeBucket(bucket));
  return out;
}

export async function getBars(yahooSymbol, interval, opts = {}) {
  const yahooInterval = YAHOO_INTERVAL_MAP[interval];
  if (!yahooInterval) throw new HttpError(400, `Unsupported interval: ${interval}`);
  const isDaily = interval === '1d';
  const is4h = interval === '4h';
  const { from, to, range: rangeOverride } = opts;

  const cacheKey = from && to
    ? `yahoo:${yahooSymbol}:${yahooInterval}:${from.getTime()}:${to.getTime()}`
    : `yahoo:${yahooSymbol}:${yahooInterval}:${rangeOverride || LEGACY_DEFAULT_RANGE[interval] || '5d'}`;

  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = new URL(`/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`, env.marketData.yahooBaseUrl);
  url.searchParams.set('interval', yahooInterval);
  url.searchParams.set('includePrePost', 'false');
  url.searchParams.set('events', 'div,splits');

  if (from && to) {
    url.searchParams.set('period1', String(Math.floor(from.getTime() / 1000)));
    url.searchParams.set('period2', String(Math.floor(to.getTime() / 1000)));
  } else {
    url.searchParams.set('range', rangeOverride || LEGACY_DEFAULT_RANGE[interval] || '5d');
  }

  const raw = await enqueue(() => fetchChart(url));
  const rawBars = normalizeBars(raw, isDaily);
  const bars = is4h ? aggregateTo4h(rawBars) : rawBars;
  const ttl = env.marketData.cacheTtl[interval] ?? 60_000;
  cacheSet(cacheKey, bars, Math.min(ttl, 5 * 60_000));
  return bars;
}

const QUOTE_TTL_MS = 30_000;

export async function getQuote(yahooSymbol) {
  const cacheKey = `yahoo-quote:${yahooSymbol}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = new URL(`/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`, env.marketData.yahooBaseUrl);
  url.searchParams.set('interval', '1m');
  url.searchParams.set('range', '1d');
  url.searchParams.set('includePrePost', 'false');

  const raw = await enqueue(() => fetchChart(url));
  const result = raw.chart.result[0];
  const meta = result?.meta || {};

  const price = meta.regularMarketPrice ?? null;
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? null;

  const quote = {
    symbol: meta.symbol ?? yahooSymbol,
    price,
    previousClose,
    change: price != null && previousClose != null ? +(price - previousClose).toFixed(4) : null,
    changePct: price != null && previousClose ? +(((price - previousClose) / previousClose) * 100).toFixed(3) : null,
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