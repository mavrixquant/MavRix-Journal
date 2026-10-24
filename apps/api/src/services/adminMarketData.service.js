import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../lib/audit.js';
import { resolveSymbol, SYMBOL_CATALOG, SUPPORTED_INTERVALS } from '../lib/marketData/symbolMap.js';
import { getBars as getYahooBars } from '../lib/marketData/yahooProvider.js';
import { getBars as getBiquoteBars } from '../lib/marketData/biquoteProvider.js';

const PROVIDER_FETCHERS = { yahoo: getYahooBars, biquote: getBiquoteBars };

const MAX_CHUNK_DAYS = {
  '1m': 6, '5m': 55, '15m': 55, '1h': 700, '4h': 700, '1d': 3000,
};

// Render free tier: keep each request well under the 100 s cap and under
// typical browser fetch timeouts. Client re-clicks to continue.
const MAX_CHUNKS_PER_REQUEST = 8;
const REQUEST_TIME_BUDGET_MS = 22_000;

function cryptoId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function getChunks(from, to, interval) {
  const maxDays = MAX_CHUNK_DAYS[interval] || 30;
  const chunks = [];
  let cursor = new Date(from);
  const end = new Date(to);
  while (cursor < end) {
    const chunkEnd = new Date(Math.min(cursor.getTime() + maxDays * 86400000, end.getTime()));
    chunks.push({ from: new Date(cursor), to: chunkEnd });
    cursor = chunkEnd;
  }
  return chunks;
}

export async function getStats() {
  const [rawCounts, coverage] = await Promise.all([
    prisma.$queryRaw`
      SELECT symbol, interval, COUNT(*)::int AS count,
             MIN(time) AS min_time, MAX(time) AS max_time
      FROM market_bars
      GROUP BY symbol, interval
      ORDER BY symbol, interval
    `,
    prisma.marketBarCoverage.findMany({ orderBy: [{ symbol: 'asc' }, { interval: 'asc' }] }),
  ]);

  const countMap = new Map();
  for (const row of rawCounts) countMap.set(`${row.symbol}|${row.interval}`, row);

  const coverageKeys = new Set(coverage.map((c) => `${c.symbol}|${c.interval}`));
  for (const row of rawCounts) {
    const key = `${row.symbol}|${row.interval}`;
    if (!coverageKeys.has(key)) {
      coverage.push({
        symbol: row.symbol, interval: row.interval,
        provider: 'unknown', providerSymbol: row.symbol,
        fromTime: row.min_time, toTime: row.max_time,
        lastFetchedAt: null, lastError: null, backoffUntil: null,
      });
    }
  }

  const rows = coverage.map((c) => {
    const s = countMap.get(`${c.symbol}|${c.interval}`) || {};
    return {
      symbol: c.symbol,
      interval: c.interval,
      provider: c.provider,
      providerSymbol: c.providerSymbol,
      barCount: Number(s.count) || 0,
      dbFromTime: s.min_time || null,
      dbToTime: s.max_time || null,
      coverageFrom: c.fromTime,
      coverageTo: c.toTime,
      lastFetchedAt: c.lastFetchedAt,
      lastError: c.lastError,
      backoffUntil: c.backoffUntil,
    };
  });

  rows.sort((a, b) => {
    if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
    return SUPPORTED_INTERVALS.indexOf(a.interval) - SUPPORTED_INTERVALS.indexOf(b.interval);
  });

  return {
    rows,
    totals: {
      totalBars: rows.reduce((s, r) => s + r.barCount, 0),
      symbolCount: new Set(rows.map((r) => r.symbol)).size,
      intervalCount: new Set(rows.map((r) => r.interval)).size,
      coverageRows: rows.length,
    },
    symbols: SYMBOL_CATALOG.map((s) => ({
      code: s.code, label: s.label, category: s.category, provider: s.provider,
    })),
    intervals: SUPPORTED_INTERVALS,
  };
}

async function bulkUpsertBars(symbol, interval, provider, bars) {
  if (bars.length === 0) return 0;

  const dedup = new Map();
  for (const b of bars) {
    const key = typeof b.time === 'string' ? b.time : new Date(b.time * 1000).toISOString();
    dedup.set(key, b);
  }
  const unique = [...dedup.values()];
  const CHUNK_SIZE = 3000;
  let inserted = 0;

  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const chunk = unique.slice(i, i + CHUNK_SIZE);
    const params = [];
    const values = chunk.map((b, j) => {
      const base = j * 10;
      const timeIso = typeof b.time === 'string'
        ? `${b.time}T00:00:00.000Z`
        : new Date(b.time * 1000).toISOString();
      params.push(cryptoId(), symbol, interval, timeIso, b.open, b.high, b.low, b.close, b.volume ?? 0, provider);
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4}::timestamp,$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10})`;
    }).join(',');

    await prisma.$executeRawUnsafe(
      `INSERT INTO market_bars (id, symbol, interval, time, open, high, low, close, volume, provider)
       VALUES ${values}
       ON CONFLICT (symbol, interval, time) DO UPDATE
         SET open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
             close = EXCLUDED.close, volume = EXCLUDED.volume,
             provider = EXCLUDED.provider, "fetchedAt" = now()`,
      ...params
    );
    inserted += chunk.length;
  }
  return inserted;
}

async function recomputeCoverage(symbol, interval, provider, providerSymbol) {
  const row = await prisma.$queryRaw`
    SELECT MIN(time) AS min_t, MAX(time) AS max_t
    FROM market_bars WHERE symbol = ${symbol} AND interval = ${interval}
  `;
  const min_t = row?.[0]?.min_t;
  const max_t = row?.[0]?.max_t;
  if (!min_t || !max_t) return;

  await prisma.marketBarCoverage.upsert({
    where: { symbol_interval: { symbol, interval } },
    create: { symbol, interval, provider, providerSymbol, fromTime: min_t, toTime: max_t },
    update: { fromTime: min_t, toTime: max_t, lastFetchedAt: new Date(), lastError: null },
  });
}

export async function importRange({ symbol, interval, from, to, actor }) {
  if (!symbol) throw new HttpError(400, 'symbol is required');
  if (!interval) throw new HttpError(400, 'interval is required');
  if (!SUPPORTED_INTERVALS.includes(interval)) {
    throw new HttpError(400, `Unsupported interval "${interval}". Allowed: ${SUPPORTED_INTERVALS.join(', ')}`);
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new HttpError(400, 'from and to must be valid dates');
  }
  if (fromDate >= toDate) throw new HttpError(400, 'from must be before to');

  const resolved = resolveSymbol(symbol);
  if (!resolved) throw new HttpError(404, `Symbol "${symbol}" not in catalog.`);
  const fetch = PROVIDER_FETCHERS[resolved.provider];
  if (!fetch) throw new HttpError(500, `No provider fetcher for ${resolved.provider}`);

  const sym = String(symbol).toUpperCase();
  const chunks = getChunks(fromDate, toDate, interval);
  const startedAt = Date.now();

  let fetched = 0, inserted = 0, chunksDone = 0;
  const errors = [];
  let complete = true;

  for (const chunk of chunks) {
    if (chunksDone >= MAX_CHUNKS_PER_REQUEST || (Date.now() - startedAt) > REQUEST_TIME_BUDGET_MS) {
      complete = false;
      break;
    }
    try {
      const rawBars = await fetch(resolved.providerSymbol, interval, { from: chunk.from, to: chunk.to });
      fetched += rawBars.length;
      if (rawBars.length > 0) {
        inserted += await bulkUpsertBars(sym, interval, resolved.provider, rawBars);
      }
      await recomputeCoverage(sym, interval, resolved.provider, resolved.providerSymbol);
      chunksDone += 1;
    } catch (err) {
      const isRate = err?.status === 429;
      const backoffMs = isRate ? 5 * 60_000 : 60_000;
      await prisma.marketBarCoverage.upsert({
        where: { symbol_interval: { symbol: sym, interval } },
        create: {
          symbol: sym, interval,
          provider: resolved.provider, providerSymbol: resolved.providerSymbol,
          fromTime: chunk.from, toTime: chunk.from,
          backoffUntil: new Date(Date.now() + backoffMs), lastError: err.message,
        },
        update: {
          backoffUntil: new Date(Date.now() + backoffMs), lastError: err.message,
        },
      });
      errors.push(
        `Chunk ${chunk.from.toISOString().slice(0, 10)} -> ${chunk.to.toISOString().slice(0, 10)}: ${err.message}`
      );
      complete = false;
      break;
    }
  }

  const coverage = await prisma.marketBarCoverage.findUnique({
    where: { symbol_interval: { symbol: sym, interval } },
  });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'market-data.import',
    targetType: 'market_bars',
    targetId: `${sym}:${interval}`,
    metadata: { from, to, fetched, inserted, chunksDone, complete, errors },
    req: actor.req,
  });

  return {
    ok: errors.length === 0,
    symbol: sym,
    interval,
    provider: resolved.provider,
    requested: { from: fromDate.toISOString(), to: toDate.toISOString() },
    totalChunks: chunks.length,
    chunksDone,
    complete,
    fetched,
    inserted,
    errors,
    elapsedMs: Date.now() - startedAt,
    coverage: coverage ? {
      fromTime: coverage.fromTime,
      toTime: coverage.toTime,
      lastFetchedAt: coverage.lastFetchedAt,
      lastError: coverage.lastError,
      backoffUntil: coverage.backoffUntil,
    } : null,
  };
}

export async function wipeCache({ symbol, interval, actor }) {
  if (!symbol) throw new HttpError(400, 'symbol is required');
  const sym = String(symbol).toUpperCase();

  const where = { symbol: sym };
  if (interval) where.interval = interval;

  const del = await prisma.marketBar.deleteMany({ where });
  await prisma.marketBarCoverage.deleteMany({ where });

  // Group wipe (no interval) uses SYM:(all); single-interval uses SYM:interval.
  const targetId = interval ? `${sym}:${interval}` : `${sym}:(all)`;

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'market-data.wipe',
    targetType: 'market_bars',
    targetId,
    metadata: { deleted: del.count, interval: interval || null },
    req: actor.req,
  });

  return { ok: true, deleted: del.count, symbol: sym, interval: interval || null };
}