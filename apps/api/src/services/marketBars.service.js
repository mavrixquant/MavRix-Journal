import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { resolveSymbol } from '../lib/marketData/symbolMap.js';
import { getBars as getYahooBars } from '../lib/marketData/yahooProvider.js';
import { getBars as getBiquoteBars } from '../lib/marketData/biquoteProvider.js';

const PROVIDER_FETCHERS = { yahoo: getYahooBars, biquote: getBiquoteBars };

const FRESHNESS_MS = { '1m': 60_000, '5m': 5 * 60_000, '15m': 15 * 60_000, '1h': 30 * 60_000, '4h': 60 * 60_000, '1d': 60 * 60_000 };

// Yahoo throws 422 if we request exactly the maximum allowed. We use a safety margin.
const MAX_CHUNK_DAYS = { '1m': 6, '5m': 55, '15m': 55, '1h': 700, '4h': 700, '1d': 3000 };

const DEFAULT_WINDOW_DAYS = 30;

export async function getBars({ symbol, interval, from: rawFrom, to: rawTo, before: rawBefore, after: rawAfter, limit = 1000 }) {
  if (!symbol) throw new HttpError(400, 'symbol is required');
  if (!interval) throw new HttpError(400, 'interval is required');

  const resolved = resolveSymbol(symbol);
  if (!resolved) throw new HttpError(404, `Symbol "${symbol}" not in catalog.`);

  const sym = symbol.toUpperCase();
  const now = new Date();
  const limitSafe = Math.min(Math.max(1, Number(limit) || 1000), 5000);

  const from = rawFrom ? new Date(rawFrom) : null;
  const to = rawTo ? new Date(rawTo) : null;
  const before = rawBefore ? new Date(rawBefore) : null;
  const after = rawAfter ? new Date(rawAfter) : null;

  const coverage = await prisma.marketBarCoverage.findUnique({ where: { symbol_interval: { symbol: sym, interval } } });

  const isExplicitRange = !!(from && to) && !before && !after;
  const isScrollBack = !!before;
  const isScrollForward = !!after;

  const effectiveFrom = isExplicitRange ? from : isScrollBack ? null : isScrollForward ? null : new Date(now.getTime() - DEFAULT_WINDOW_DAYS * 86400000);
  const effectiveTo = isExplicitRange ? to : isScrollBack ? null : isScrollForward ? null : now;

  const where = { symbol: sym, interval };
  if (isScrollBack) where.time = { lt: before };
  else if (isScrollForward) where.time = { gt: after };
  else where.time = { gte: effectiveFrom, lte: effectiveTo };

  let page = await prisma.marketBar.findMany({
    where, orderBy: { time: isScrollBack ? 'desc' : 'asc' }, take: limitSafe + 1,
  });

  const fetchedAll = page.length <= limitSafe;
  if (!fetchedAll) page = page.slice(0, limitSafe);
  if (isScrollBack) page.reverse();

  const gaps = computeGaps({ coverage, now, interval, effectiveFrom, effectiveTo, isScrollBack, isScrollForward, isExplicitRange, before, after });

  let filling = false;
  let fillError = null;

  const inBackoff = coverage?.backoffUntil && coverage.backoffUntil > now;
  if (inBackoff) {
    fillError = 'Provider cooldown';
  } else if (gaps.length > 0) {
    const shouldBlock = !coverage || gaps.every((g) => (g.to - g.from) / 86400000 <= 3);

    if (shouldBlock && !isScrollBack && !isScrollForward) {
      await fillGaps({ symbol: sym, interval, resolved, gaps });
      page = await prisma.marketBar.findMany({ where, orderBy: { time: isScrollBack ? 'desc' : 'asc' }, take: limitSafe + 1 });
      if (page.length > limitSafe) page = page.slice(0, limitSafe);
      if (isScrollBack) page.reverse();
    } else {
      filling = true;
      void fillGaps({ symbol: sym, interval, resolved, gaps });
    }
  }

  const bars = page.map((b) => ({
    time: interval === '1d' ? b.time.toISOString().slice(0, 10) : Math.floor(b.time.getTime() / 1000),
    open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
  }));

  const coveredBefore = coverage && coverage.fromTime && page[0] ? coverage.fromTime < page[0].time : false;
  const coveredAfter = coverage && coverage.toTime && page[page.length - 1] ? coverage.toTime > page[page.length - 1].time : false;

  let hasMoreOlder = false;
  let hasMoreNewer = false;
  if (isScrollBack) { hasMoreOlder = !fetchedAll || coveredBefore; }
  else if (isScrollForward) { hasMoreNewer = !fetchedAll || coveredAfter; }
  else if (isExplicitRange) { hasMoreNewer = !fetchedAll || coveredAfter; }
  else { hasMoreOlder = !fetchedAll || coveredBefore; }

  return {
    symbol: sym, interval, provider: resolved.provider, providerSymbol: resolved.providerSymbol, count: bars.length, bars, hasMoreOlder, hasMoreNewer,
    oldestInDb: coverage?.fromTime ?? null, newestInDb: coverage?.toTime ?? null, filling, fillError, backoffUntil: coverage?.backoffUntil ?? null,
  };
}

function computeGaps({ coverage, now, interval, effectiveFrom, effectiveTo, isScrollBack, isExplicitRange, before }) {
  const gaps = [];
  if (!coverage) {
    const to = effectiveTo ?? now;
    const from = effectiveFrom ?? new Date(to.getTime() - DEFAULT_WINDOW_DAYS * 86400000);
    gaps.push({ from, to });
    return gaps;
  }
  if (isScrollBack && before && (!coverage.fromTime || before <= coverage.fromTime)) {
    const chunkEnd = coverage.fromTime ?? now;
    const chunkStart = new Date(Math.max(0, chunkEnd.getTime() - 30 * 86400000));
    if (chunkStart < chunkEnd) gaps.push({ from: chunkStart, to: chunkEnd });
  }
  if (isExplicitRange && effectiveFrom && coverage.fromTime > effectiveFrom) {
    gaps.push({ from: effectiveFrom, to: coverage.fromTime });
  }
  if (!isScrollBack) {
    const targetTo = effectiveTo ?? now;
    const freshUntil = new Date(now.getTime() - (FRESHNESS_MS[interval] ?? 60_000));
    if (coverage.toTime < targetTo && coverage.toTime < freshUntil) {
      gaps.push({ from: coverage.toTime, to: targetTo });
    }
  }
  return gaps;
}

async function fillGaps({ symbol, interval, resolved, gaps }) {
  const fetch = PROVIDER_FETCHERS[resolved.provider];
  if (!fetch) return;
  const maxDays = MAX_CHUNK_DAYS[interval] ?? 60;

  for (const gap of gaps) {
    const chunks = [];
    let cursor = new Date(gap.from);
    while (cursor < gap.to) {
      const end = new Date(Math.min(cursor.getTime() + maxDays * 86400000, gap.to.getTime()));
      chunks.push({ from: new Date(cursor), to: end });
      cursor = end;
    }
    for (const chunk of chunks) {
      try {
        const rawBars = await fetch(resolved.providerSymbol, interval, { from: chunk.from, to: chunk.to });
        if (rawBars.length > 0) await bulkUpsertBars(symbol, interval, resolved.provider, rawBars);
        await recomputeCoverage(symbol, interval, resolved);
      } catch (err) {
        const isRate = err?.status === 429;
        const backoffMs = isRate ? 5 * 60_000 : 60_000;
        await prisma.marketBarCoverage.upsert({
          where: { symbol_interval: { symbol, interval } },
          create: { symbol, interval, provider: resolved.provider, providerSymbol: resolved.providerSymbol, fromTime: chunk.from, toTime: chunk.from, backoffUntil: new Date(Date.now() + backoffMs), lastError: err.message },
          update: { backoffUntil: new Date(Date.now() + backoffMs), lastError: err.message },
        });
        console.warn(`[mkt-bars] fill failed ${symbol} ${interval} ${err.message}`);
        return;
      }
    }
  }
}

async function bulkUpsertBars(symbol, interval, provider, bars) {
  const dedup = new Map();
  for (const b of bars) {
    const key = typeof b.time === 'string' ? b.time : new Date(b.time * 1000).toISOString();
    dedup.set(key, b);
  }
  const unique = [...dedup.values()];
  if (unique.length === 0) return;

  const CHUNK_SIZE = 3000;
  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const chunk = unique.slice(i, i + CHUNK_SIZE);
    const params = [];
    const values = chunk.map((b, j) => {
      const base = j * 10;
      const timeIso = typeof b.time === 'string' ? `${b.time}T00:00:00.000Z` : new Date(b.time * 1000).toISOString();
      params.push(cryptoId(), symbol, interval, timeIso, b.open, b.high, b.low, b.close, b.volume ?? 0, provider);
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4}::timestamp,$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10})`;
    }).join(',');

    await prisma.$executeRawUnsafe(
      `INSERT INTO market_bars (id, symbol, interval, time, open, high, low, close, volume, provider)
       VALUES ${values}
       ON CONFLICT (symbol, interval, time) DO UPDATE
         SET open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume, provider = EXCLUDED.provider, "fetchedAt" = now()`,
      ...params,
    );
  }
}

function cryptoId() { return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`; }

async function recomputeCoverage(symbol, interval, resolved) {
  const row = await prisma.$queryRaw`SELECT MIN("time") AS min_t, MAX("time") AS max_t FROM market_bars WHERE symbol = ${symbol} AND interval = ${interval}`;
  const min_t = row?.[0]?.min_t;
  const max_t = row?.[0]?.max_t;
  if (!min_t || !max_t) return;

  await prisma.marketBarCoverage.upsert({
    where: { symbol_interval: { symbol, interval } },
    create: { symbol, interval, provider: resolved.provider, providerSymbol: resolved.providerSymbol, fromTime: min_t, toTime: max_t },
    update: { fromTime: min_t, toTime: max_t, lastFetchedAt: new Date(), lastError: null },
  });
}