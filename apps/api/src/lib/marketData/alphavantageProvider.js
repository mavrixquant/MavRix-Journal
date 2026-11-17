import { env } from '../../config/env.js';
import { HttpError } from '../../middleware/error.js';
import { enqueueAlphaVantage } from './queue.js';
import { get as cacheGet, set as cacheSet } from './cache.js';

const ALPHA_VANTAGE_INTERVAL_MAP = {
  '1m': '1min',
  '5m': '5min',
  '15m': '15min',
  '1h': '60min',
  '4h': '60min', // Will aggregate 4 x 1h bars
  '1d': 'daily',
};

// Alpha Vantage free tier limits (reference only; enforced by AV, not us)
// const INTERVAL_LIMITS = {
//   '1min': 2000, // Alpha Vantage free tier limit
//   '5min': 2000,
//   '15min': 2000,
//   '30min': 2000,
//   '60min': 2000,
//   'daily': 5000,
// };

const CACHE_TTL = {
  '1m': 60_000,      // 1 minute
  '5m': 5 * 60_000,  // 5 minutes
  '15m': 15 * 60_000, // 15 minutes
  '1h': 30 * 60_000,  // 30 minutes
  '4h': 60 * 60_000,  // 1 hour
  '1d': 60 * 60_000,  // 1 hour
};

function normalizeTime(dateStr, isDaily) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  if (isDaily) return d.toISOString().slice(0, 10);
  return Math.floor(d.getTime() / 1000);
}

function normalizeBars(raw, interval) {
  if (!raw || !raw['Time Series (1min)'] && !raw['Time Series (5min)'] && !raw['Time Series (15min)'] && !raw['Time Series (60min)'] && !raw['Time Series (Daily)']) {
    return [];
  }

  const isDaily = interval === '1d';
  const timeSeriesKey = isDaily ? 'Time Series (Daily)' : `Time Series (${ALPHA_VANTAGE_INTERVAL_MAP[interval]})`;
  const timeSeries = raw[timeSeriesKey];

  if (!timeSeries) return [];

  const bars = [];
  for (const [timeStr, data] of Object.entries(timeSeries)) {
    const time = normalizeTime(timeStr, isDaily);
    if (time == null) continue;

    const open = Number(data['1. open']);
    const high = Number(data['2. high']);
    const low = Number(data['3. low']);
    const close = Number(data['4. close']);
    const volume = Number(data['5. volume']) || Number(data['6. volume']) || 0;

    if (![open, high, low, close].every(Number.isFinite)) continue;

    bars.push({
      time,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  bars.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  return bars;
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
    high,
    low,
    close: bucket[bucket.length - 1].close,
    volume,
  };
}

export async function getBars(symbol, interval, opts = {}) {
  const avInterval = ALPHA_VANTAGE_INTERVAL_MAP[interval];
  if (!avInterval) throw new HttpError(400, `Alpha Vantage: unsupported interval "${interval}"`);

  const { from, to } = opts;
  const is4h = interval === '4h';
  const cacheKey = from && to
    ? `alphavantage:${symbol}:${avInterval}:${from.getTime()}:${to.getTime()}`
    : `alphavantage:${symbol}:${avInterval}`;

  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const apiKey = env.marketData.alphaVantageApiKey;
  if (!apiKey) {
    throw new HttpError(500, 'Alpha Vantage API key not configured');
  }

  const baseUrl = env.marketData.alphaVantageBaseUrl;
  const params = new URLSearchParams({
    function: avInterval === 'daily' ? 'TIME_SERIES_DAILY' : 'TIME_SERIES_INTRADAY',
    symbol,
    interval: avInterval,
    apikey: apiKey,
  });

  if (avInterval !== 'daily') {
    params.set('outputsize', 'full'); // Get maximum historical data
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.marketData.alphaVantageTimeoutMs);

  try {
    const raw = await enqueueAlphaVantage(() => fetch(`${baseUrl}?${params}`, { signal: controller.signal }));
    if (!raw.ok) {
      if (raw.status === 429) throw new HttpError(429, 'Alpha Vantage rate limit exceeded');
      throw new HttpError(raw.status, `Alpha Vantage error: ${raw.statusText}`);
    }

    const data = await raw.json();

    // Check for API errors
    if (data['Error Message']) {
      throw new HttpError(400, `Alpha Vantage: ${data['Error Message']}`);
    }
    if (data['Note']) {
      // Rate limit note
      throw new HttpError(429, `Alpha Vantage rate limit: ${data['Note']}`);
    }
    if (data['Information']) {
      // Alpha Vantage returns "Information" for premium endpoints on free tier.
      // This means no data was returned - treat as an error so fallback can work.
      throw new HttpError(402, `Alpha Vantage premium required: ${data['Information']}`);
    }

    let bars = normalizeBars(data, interval);

    // Filter by date range if specified
    if (from && to && bars.length > 0) {
      const fromSec = Math.floor(from.getTime() / 1000);
      const toSec = Math.floor(to.getTime() / 1000);
      bars = bars.filter(b => b.time >= fromSec && b.time <= toSec);
    }

    // Aggregate to 4h if needed
    if (is4h) {
      bars = aggregateTo4h(bars);
    }

    cacheSet(cacheKey, bars, Math.min(CACHE_TTL[interval] ?? 60_000, 5 * 60_000));
    return bars;
  } catch (err) {
    if (err?.name === 'AbortError') throw new HttpError(504, 'Alpha Vantage timeout');
    if (err instanceof HttpError) throw err;
    throw new HttpError(502, `Alpha Vantage request failed for ${symbol}: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

// Alpha Vantage free tier doesn't support real-time quotes.
// Return a marker so the caller can fall back to Yahoo/Biquote.
export async function getQuote() {
  return null; // Signal: try next provider
}