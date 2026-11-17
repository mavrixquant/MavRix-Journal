// ============================================================================
// MARKET DATA IMPORT SERVICE — v2 (correct gap detection + dedup)
// ============================================================================
// Design:
//   1. One-click import: Symbol + Date Range → all 6 intervals
//   2. Gap detection happens at CHUNK level against real DB data (not coverage
//      table alone, which can drift) — chunks fully covered by existing bars
//      are skipped and never fetched from providers.
//   3. Provider fallback chain per symbol category; premium/rate-limit errors
//      fall through automatically.
//   4. Parent job + 6 child jobs (one per interval); progress aggregates up.
//   5. Re-import of the same range is a no-op (0 chunks, alreadyComplete).
// ============================================================================

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../lib/audit.js';
import { broadcastToAll } from '../lib/broadcaster.js';
import {
  resolveSymbol,
  SUPPORTED_INTERVALS,
} from '../lib/marketData/index.js';
import { getBars as getYahooBars } from '../lib/marketData/yahooProvider.js';
import { getBars as getBiquoteBars } from '../lib/marketData/biquoteProvider.js';
import { getBars as getAlphaVantageBars } from '../lib/marketData/alphavantageProvider.js';

// ---------------------------------------------------------------------------
// Provider configuration
// ---------------------------------------------------------------------------

const PROVIDER_FETCHERS = {
  yahoo: getYahooBars,
  biquote: getBiquoteBars,
  alphavantage: getAlphaVantageBars,
};

// Provider preference by symbol category (first = primary)
const PROVIDER_PREFERENCE = {
  futures: ['yahoo'],
  crypto: ['yahoo'],
  forex: ['alphavantage', 'biquote', 'yahoo'],
  metals: ['biquote', 'alphavantage'],
};

// Days per chunk — sized so a provider call never exceeds its page limit
const CHUNK_DAYS = {
  '1m': 2,
  '5m': 7,
  '15m': 14,
  '1h': 30,
  '4h': 60,
  '1d': 365,
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const runningJobs = new Map();  // parentJobId -> { stopped: bool }
const activeKeys = new Map();   // "SYMBOL" -> parentJobId (one import per symbol)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cryptoId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function getCategoryForSymbol(symbol) {
  const futures = ['NQ', 'MNQ', 'ES', 'MES', 'YM', 'MYM', 'GC', 'MGC', 'CL', 'MCL'];
  const crypto = ['BTCUSD', 'ETHUSD', 'SOLUSD'];
  const forex = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY'];
  const metals = ['XAUUSD', 'XAGUSD'];

  if (futures.includes(symbol)) return 'futures';
  if (crypto.includes(symbol)) return 'crypto';
  if (forex.includes(symbol)) return 'forex';
  if (metals.includes(symbol)) return 'metals';
  return 'unknown';
}

function getProvidersForSymbol(symbol) {
  return PROVIDER_PREFERENCE[getCategoryForSymbol(symbol)] || ['yahoo', 'biquote'];
}

// Split [from, to] into chunks of maxDays each
function getChunksForRange(from, to, interval) {
  const maxDays = CHUNK_DAYS[interval] || 30;
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

// ---------------------------------------------------------------------------
// Chunk-level gap detection against REAL bar data.
// A chunk is "covered" if the DB has at least one bar inside it AND the
// chunk's [from, to] window is fully inside the DB's [min, max] for that
// (symbol, interval). This avoids re-fetching data that's already there.
// ---------------------------------------------------------------------------

async function getDbRange(symbol, interval) {
  const row = await prisma.$queryRaw`
    SELECT MIN(time) AS min_t, MAX(time) AS max_t
    FROM market_bars
    WHERE symbol = ${symbol} AND interval = ${interval}
  `;
  const minT = row?.[0]?.min_t;
  const maxT = row?.[0]?.max_t;
  if (!minT || !maxT) return null;
  return { from: new Date(minT), to: new Date(maxT) };
}

// Returns chunks that are NOT fully covered by existing DB data.
async function computeMissingChunks(symbol, interval, from, to) {
  const allChunks = getChunksForRange(from, to, interval);
  const dbRange = await getDbRange(symbol, interval);

  if (!dbRange) return { missing: allChunks, covered: 0 };

  const dbFrom = dbRange.from.getTime();
  const dbTo = dbRange.to.getTime();

  // A chunk is covered when the whole chunk window sits inside the DB range.
  const missing = allChunks.filter((c) => {
    const cFrom = c.from.getTime();
    const cTo = c.to.getTime();
    return cTo <= dbFrom || cFrom >= dbTo; // entirely outside DB range
  });

  return { missing, covered: allChunks.length - missing.length };
}

function serializeJob(j) {
  return {
    id: j.id,
    symbol: j.symbol,
    interval: j.interval,
    fromTime: j.fromTime,
    toTime: j.toTime,
    status: j.status,
    totalChunks: j.totalChunks,
    chunksDone: j.chunksDone,
    fetched: j.fetched,
    inserted: j.inserted,
    lastError: j.lastError,
    startedAt: j.startedAt,
    finishedAt: j.finishedAt,
  };
}

function broadcastJob(job) {
  try { broadcastToAll('market-data:job:update', serializeJob(job)); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Bulk upsert
// ---------------------------------------------------------------------------

async function bulkUpsertBars(symbol, interval, provider, bars) {
  if (!bars.length) return 0;

  const dedup = new Map();
  for (const b of bars) {
    const key = typeof b.time === 'string' ? b.time : new Date(b.time * 1000).toISOString();
    dedup.set(key, b);
  }
  const unique = [...dedup.values()];
  const CHUNK_SIZE = 3000;
  let inserted = 0;

  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const slice = unique.slice(i, i + CHUNK_SIZE);
    const params = [];
    const values = slice.map((b, j) => {
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
    inserted += slice.length;
  }
  return inserted;
}

async function recomputeCoverage(symbol, interval, provider, providerSymbol) {
  const row = await prisma.$queryRaw`
    SELECT MIN(time) AS min_t, MAX(time) AS max_t
    FROM market_bars WHERE symbol = ${symbol} AND interval = ${interval}
  `;
  const minT = row?.[0]?.min_t;
  const maxT = row?.[0]?.max_t;
  if (!minT || !maxT) return;

  await prisma.marketBarCoverage.upsert({
    where: { symbol_interval: { symbol, interval } },
    create: { symbol, interval, provider, providerSymbol, fromTime: minT, toTime: maxT },
    update: { fromTime: minT, toTime: maxT, lastFetchedAt: new Date(), lastError: null },
  });
}

// ---------------------------------------------------------------------------
// Fetch one chunk with provider fallback chain.
// Returns { bars, provider } or throws if every provider failed.
// ---------------------------------------------------------------------------

async function fetchChunkWithFallback(symbol, interval, chunkFrom, chunkTo) {
  const providers = getProvidersForSymbol(symbol);
  let lastErr = null;

  for (const providerName of providers) {
    const fetchFn = PROVIDER_FETCHERS[providerName];
    if (!fetchFn) continue;

    const providerResolved = resolveSymbol(symbol, providerName);
    if (!providerResolved) continue;

    try {
      const bars = await fetchFn(providerResolved.providerSymbol, interval, {
        from: chunkFrom,
        to: chunkTo,
      });
      return { bars, provider: providerName };
    } catch (err) {
      lastErr = err;
      const isPremium = err?.status === 402;
      const isRate = err?.status === 429;
      // Premium endpoint or rate limit → straight to next provider (no retry)
      // Other errors → brief backoff then next provider
      if (!isPremium && !isRate) {
        await new Promise((r) => setTimeout(r, 1000));
      }
      console.warn(`[import] ${providerName} failed for ${symbol} ${interval}: ${err.message}`);
    }
  }

  throw lastErr || new HttpError(502, `All providers failed for ${symbol} ${interval}`);
}

// ---------------------------------------------------------------------------
// Import ONE interval: only the missing chunks, tracked as a child job.
// Updates the PARENT job's progress after each chunk so the UI sees
// incremental progress across all intervals, not just the current child.
// Accepts optional existingJobId to update a pre-created child job in place.
// ---------------------------------------------------------------------------

async function updateParentProgress(parentId) {
  const children = await prisma.marketImportJob.findMany({
    where: { parentId },
    select: { status: true, totalChunks: true, chunksDone: true, fetched: true, inserted: true },
  });
  const totalChunks = children.reduce((s, j) => s + (j.totalChunks || 0), 0);
  const chunksDone = children.reduce((s, j) => s + (j.chunksDone || 0), 0);
  const fetched = children.reduce((s, j) => s + (j.fetched || 0), 0);
  const inserted = children.reduce((s, j) => s + (j.inserted || 0), 0);
  const allDone = children.every((j) => j.status === 'completed' || j.status === 'failed' || j.status === 'stopped');
  return { totalChunks, chunksDone, fetched, inserted, allDone };
}

async function importInterval(parentId, symbol, interval, from, to, actor, existingJobId = null) {
  const { missing } = await computeMissingChunks(symbol, interval, from, to);

  let job;
  if (existingJobId) {
    // Update the pre-created child job
    job = await prisma.marketImportJob.update({
      where: { id: existingJobId },
      data: {
        status: missing.length === 0 ? 'completed' : 'running',
        totalChunks: missing.length,
        chunksDone: 0,
        fetched: 0,
        inserted: 0,
        finishedAt: missing.length === 0 ? new Date() : null,
        lastError: null,
      },
    });
  } else {
    job = await prisma.marketImportJob.create({
      data: {
        parentId,
        symbol,
        interval,
        fromTime: from,
        toTime: to,
        status: missing.length === 0 ? 'completed' : 'running',
        totalChunks: missing.length,
        chunksDone: 0,
        fetched: 0,
        inserted: 0,
        startedById: actor.id,
        finishedAt: missing.length === 0 ? new Date() : null,
        lastError: null,
      },
    });
  }

  if (missing.length === 0) {
    await syncParentProgress(parentId);
    broadcastJob(job);
    return job;
  }

  let chunksDone = 0;
  let fetched = 0;
  let inserted = 0;
  let lastError = null;
  let finalStatus = 'completed';

  try {
    for (let i = 0; i < missing.length; i++) {
      const reg = runningJobs.get(parentId);
      if (reg?.stopped) {
        finalStatus = 'stopped';
        break;
      }

      const chunk = missing[i];
      let chunkOk = false;
      let chunkFetched = 0;
      let chunkInserted = 0;
      let chunkErr = null;

      try {
        const { bars, provider } = await fetchChunkWithFallback(symbol, interval, chunk.from, chunk.to);
        chunkFetched = bars.length;
        if (bars.length > 0) {
          chunkInserted = await bulkUpsertBars(symbol, interval, provider, bars);
        }
        await recomputeCoverage(symbol, interval, provider, resolveSymbol(symbol, provider)?.providerSymbol || symbol);
        chunkOk = true;
      } catch (err) {
        chunkErr = err;
        console.warn(`[import] chunk ${i + 1}/${missing.length} failed for ${symbol} ${interval}: ${err.message}`);
      }

      if (chunkOk) {
        chunksDone++;
        fetched += chunkFetched;
        inserted += chunkInserted;
      } else {
        lastError = chunkErr?.message || 'Chunk failed';
        finalStatus = 'failed';
        break;
      }

      await prisma.marketImportJob.update({
        where: { id: job.id },
        data: { chunksDone, fetched, inserted },
      });

      // Update the PARENT's aggregate progress so the UI shows total progress
      await syncParentProgress(parentId);

      broadcastJob({ ...job, chunksDone, fetched, inserted });
    }
  } catch (err) {
    finalStatus = 'failed';
    lastError = err?.message || String(err);
  }

  const final = await prisma.marketImportJob.update({
    where: { id: job.id },
    data: {
      status: finalStatus,
      chunksDone,
      fetched,
      inserted,
      lastError,
      finishedAt: new Date(),
    },
  });

  await syncParentProgress(parentId);
  broadcastJob(final);
  return final;
}

// Recompute parent progress from children and persist + broadcast
async function syncParentProgress(parentId) {
  const parent = await prisma.marketImportJob.findUnique({
    where: { id: parentId },
    select: { status: true, finishedAt: true },
  });
  // Don't touch a parent that's already final or stopped
  if (!parent || parent.finishedAt) return;

  const { totalChunks, chunksDone, fetched, inserted, allDone } = await updateParentProgress(parentId);

  const update = { totalChunks, chunksDone, fetched, inserted };
  if (allDone) {
    update.finishedAt = new Date();
  }
  const updated = await prisma.marketImportJob.update({
    where: { id: parentId },
    data: update,
  });
  try { broadcastToAll('market-data:job:update', serializeJob(updated)); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// MAIN ENTRY: start import for one symbol across all intervals
// ---------------------------------------------------------------------------

export async function startImportJob({ symbol, from, to, dryRun = false, actor }) {
  if (!symbol || String(symbol).trim() === '') throw new HttpError(400, 'symbol is required');
  if (!from || !to || String(from).trim() === '' || String(to).trim() === '') {
    throw new HttpError(400, 'from and to dates are required');
  }

  const symbolUpper = String(symbol).toUpperCase().trim();
  const resolved = resolveSymbol(symbolUpper);
  if (!resolved) throw new HttpError(404, `Symbol "${symbol}" not in catalog`);

  const fromDate = new Date(String(from).trim());
  const toDate = new Date(String(to).trim());
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new HttpError(400, 'Invalid date format');
  }
  if (fromDate >= toDate) throw new HttpError(400, 'from must be before to');

  // One import per symbol at a time
  if (activeKeys.has(symbolUpper)) {
    throw new HttpError(409, `An import for ${symbolUpper} is already running`);
  }

  // ---- Per-interval gap analysis (against REAL bar data) ----
  const intervals = [];
  for (const interval of SUPPORTED_INTERVALS) {
    const { missing, covered } = await computeMissingChunks(symbolUpper, interval, fromDate, toDate);
    intervals.push({
      interval,
      chunksToImport: missing.length,
      chunksCovered: covered,
      needsImport: missing.length > 0,
    });
  }

  const totalChunksToImport = intervals.reduce((s, i) => s + i.chunksToImport, 0);

  if (dryRun) {
    return {
      dryRun: true,
      symbol: symbolUpper,
      requestedFrom: fromDate,
      requestedTo: toDate,
      provider: resolved.provider,
      category: getCategoryForSymbol(symbolUpper),
      intervals,
      totalChunksToImport,
      message: totalChunksToImport === 0
        ? 'All requested data already exists in DB — nothing to import.'
        : `Would import ${totalChunksToImport} chunk(s) across ${intervals.filter(i => i.needsImport).length} interval(s).`,
    };
  }

  // Everything already covered → return success without creating a job
  if (totalChunksToImport === 0) {
    return {
      jobId: null,
      alreadyComplete: true,
      symbol: symbolUpper,
      requestedFrom: fromDate,
      requestedTo: toDate,
      intervals,
      totalChunksToImport: 0,
      message: 'All requested data already exists in DB — nothing to import.',
    };
  }

  // ---- Parent job ----
  const parentJob = await prisma.marketImportJob.create({
    data: {
      symbol: symbolUpper,
      interval: 'all',
      fromTime: fromDate,
      toTime: toDate,
      status: 'running',
      totalChunks: totalChunksToImport,
      chunksDone: 0,
      fetched: 0,
      inserted: 0,
      startedById: actor.id,
      lastError: null,
      finishedAt: null,
    },
  });

  // ---- Pre-create ALL child jobs synchronously (one per interval) ----
  // This gives the UI a stable 6-row denominator from the start.
  const childJobs = await prisma.marketImportJob.createManyAndReturn({
    data: intervals.map((info) => ({
      parentId: parentJob.id,
      symbol: symbolUpper,
      interval: info.interval,
      fromTime: fromDate,
      toTime: toDate,
      status: info.needsImport ? 'pending' : 'skipped',
      totalChunks: info.chunksToImport,
      chunksDone: 0,
      fetched: 0,
      inserted: 0,
      startedById: actor.id,
      finishedAt: info.needsImport ? null : new Date(),
      lastError: null,
    })),
  });

  // Map interval -> child job for quick lookup
  const childJobByInterval = new Map(childJobs.map((j) => [j.interval, j]));

  activeKeys.set(symbolUpper, parentJob.id);
  runningJobs.set(parentJob.id, { stopped: false });

  // ---- Kick off children OUTSIDE the HTTP lifecycle ----
  setImmediate(async () => {
    const results = [];

    for (const info of intervals) {
      if (!info.needsImport) {
        results.push({ interval: info.interval, status: 'skipped', chunksToImport: 0 });
        continue;
      }
      try {
        const childJob = childJobByInterval.get(info.interval);
        if (!childJob) throw new Error(`Child job for ${info.interval} not found`);

        // Update child to running and import
        await prisma.marketImportJob.update({
          where: { id: childJob.id },
          data: { status: 'running' },
        });

        // Pass the EXISTING child job ID so importInterval updates it in place
        const child = await importInterval(
          parentJob.id,
          symbolUpper,
          info.interval,
          fromDate,
          toDate,
          actor,
          childJob.id
        );
        results.push({ interval: info.interval, status: child.status, chunksToImport: child.totalChunks });
      } catch (err) {
        results.push({ interval: info.interval, status: 'failed', error: err.message });
      }
    }

    // ---- Aggregate child results into parent ----
    const children = await prisma.marketImportJob.findMany({
      where: { parentId: parentJob.id },
    });

    const totalFetched = children.reduce((s, j) => s + (j.fetched || 0), 0);
    const totalInserted = children.reduce((s, j) => s + (j.inserted || 0), 0);
    const totalChunksDone = children.reduce((s, j) => s + (j.chunksDone || 0), 0);
    const failedCount = children.filter((j) => j.status === 'failed').length;
    const stoppedCount = children.filter((j) => j.status === 'stopped').length;

    let finalStatus = 'completed';
    if (stoppedCount > 0) finalStatus = 'stopped';
    else if (failedCount > 0) finalStatus = 'completed_with_errors';

    await prisma.marketImportJob.update({
      where: { id: parentJob.id },
      data: {
        status: finalStatus,
        chunksDone: totalChunksDone,
        fetched: totalFetched,
        inserted: totalInserted,
        finishedAt: new Date(),
      },
    });

    runningJobs.delete(parentJob.id);
    activeKeys.delete(symbolUpper);

    // Broadcast final parent state (children are fetched separately by UI)
    const finalParent = await prisma.marketImportJob.findUnique({ where: { id: parentJob.id } });
    broadcastJob(finalParent);

    await writeAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: `market-data.import.${finalStatus}`,
      targetType: 'market_import_job',
      targetId: parentJob.id,
      metadata: {
        symbol: symbolUpper,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        totalChunks: totalChunksToImport,
        chunksDone: totalChunksDone,
        fetched: totalFetched,
        inserted: totalInserted,
        results,
      },
      req: actor.req,
    }).catch(() => {});
  });

  return {
    jobId: parentJob.id,
    symbol: symbolUpper,
    requestedFrom: fromDate,
    requestedTo: toDate,
    category: getCategoryForSymbol(symbolUpper),
    provider: resolved.provider,
    intervals,
    totalChunksToImport,
    message: `Import started for ${symbolUpper} — ${totalChunksToImport} chunk(s) across ${intervals.filter(i => i.needsImport).length} interval(s).`,
  };
}

// ---------------------------------------------------------------------------
// Stop job (parent or child)
// ---------------------------------------------------------------------------

export async function stopJob(jobId, _actor) {
  const job = await prisma.marketImportJob.findUnique({ where: { id: jobId } });
  if (!job) throw new HttpError(404, 'Job not found');

  // If a child was passed, stop its parent instead
  const targetId = job.parentId || job.id;
  const reg = runningJobs.get(targetId);
  if (reg) reg.stopped = true;

  await prisma.marketImportJob.update({
    where: { id: targetId },
    data: { status: 'stopping' },
  });

  return { ok: true, status: 'stopping', jobId: targetId };
}

// ---------------------------------------------------------------------------
// Stats: coverage table
// ---------------------------------------------------------------------------

export async function getStats() {
  const [rawCounts, coverage] = await Promise.all([
    prisma.$queryRaw`
      SELECT symbol, interval, COUNT(*)::int AS count,
             MIN(time) AS min_time, MAX(time) AS max_time
      FROM market_bars
      GROUP BY symbol, interval
      ORDER BY symbol, interval
    `,
    prisma.marketBarCoverage.findMany({
      orderBy: [{ symbol: 'asc' }, { interval: 'asc' }],
    }),
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
    symbols: [],
    intervals: SUPPORTED_INTERVALS,
  };
}

// ---------------------------------------------------------------------------
// Jobs list (parent jobs only)
// ---------------------------------------------------------------------------

export async function listJobs({ limit = 50 } = {}) {
  const take = Math.min(Math.max(1, Number(limit) || 50), 200);
  const jobs = await prisma.marketImportJob.findMany({
    where: { interval: 'all' },
    orderBy: { startedAt: 'desc' },
    take,
  });
  return jobs.map(serializeJob);
}

// ---------------------------------------------------------------------------
// Job detail: parent + children
// ---------------------------------------------------------------------------

export async function getJob(jobId) {
  const job = await prisma.marketImportJob.findUnique({ where: { id: jobId } });
  if (!job) throw new HttpError(404, 'Job not found');

  const children = job.interval === 'all'
    ? await prisma.marketImportJob.findMany({
        where: { parentId: job.id },
        orderBy: [{ interval: 'asc' }],
      })
    : [];

  return {
    parent: serializeJob(job),
    children: children.map(serializeJob),
    totalChildren: children.length,
  };
}

// ---------------------------------------------------------------------------
// Wipe cache
// ---------------------------------------------------------------------------

export async function wipeCache({ symbol, interval, actor }) {
  if (!symbol) throw new HttpError(400, 'symbol is required');
  const sym = String(symbol).toUpperCase();

  const where = { symbol: sym };
  if (interval && interval !== 'all') where.interval = interval;

  const del = await prisma.marketBar.deleteMany({ where });
  await prisma.marketBarCoverage.deleteMany({ where });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'market-data.wipe',
    targetType: 'market_bars',
    targetId: interval ? `${sym}:${interval}` : sym,
    metadata: { deleted: del.count, interval: interval || 'all' },
    req: actor.req,
  });

  return { ok: true, deleted: del.count, symbol: sym, interval: interval || 'all' };
}
