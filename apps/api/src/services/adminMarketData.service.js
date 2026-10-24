// ============================================================================
// Admin market-data service — async import jobs + coverage stats + wipe.
//
// Import design:
//   • POST /import creates a MarketImportJob row + registers an in-memory
//     runner; returns 202 immediately with the jobId.
//   • The runner is a setImmediate() loop — OUTSIDE the HTTP lifecycle —
//     that writes progress at every chunk boundary.
//   • On boot, markInterruptedJobs() flips any leftover `running` rows to
//     `interrupted` (data already committed to market_bars is preserved).
//   • POST /jobs/:id/stop sets stopRequested; the runner exits at the next
//     chunk boundary (current chunk always finishes).
//   • SSE broadcast (`market-data:job:update`) fires at every state change so
//     the UI updates without polling — polling is the fallback.
//
// Providers: Yahoo (futures, crypto) and Biquote (forex, metals), resolved
// via lib/marketData/symbolMap.js.
// ============================================================================

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../lib/audit.js';
import { broadcastToAll } from '../lib/broadcaster.js';
import {
  resolveSymbol,
  SYMBOL_CATALOG,
  SUPPORTED_INTERVALS,
} from '../lib/marketData/symbolMap.js';
import { getBars as getYahooBars } from '../lib/marketData/yahooProvider.js';
import { getBars as getBiquoteBars } from '../lib/marketData/biquoteProvider.js';

const PROVIDER_FETCHERS = { yahoo: getYahooBars, biquote: getBiquoteBars };

const MAX_CHUNK_DAYS = {
  '1m': 6, '5m': 55, '15m': 55, '1h': 700, '4h': 700, '1d': 3000,
};

const MAX_CONCURRENT_JOBS = 2;
const MAX_CHUNKS_PER_JOB = 2000;
const MAX_JOB_DURATION_MS = 30 * 60 * 1000;
const CHUNK_RETRY_BACKOFF_MS = [2000, 5000, 15000];
const DB_STOP_CHECK_EVERY_N_CHUNKS = 10;
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000;

// In-memory registry — cleared on process restart (boot sweep handles
// the DB side; the map only holds live runners in THIS process).
const running = new Map();   // jobId -> { stopped: boolean }
const activeKeys = new Map(); // `${symbol}:${interval}` -> jobId

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cryptoId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function jobKey(symbol, interval) {
  return `${symbol}:${interval}`;
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
    stopRequested: j.stopRequested,
    startedById: j.startedById,
    startedAt: j.startedAt,
    finishedAt: j.finishedAt,
  };
}

function broadcastJob(job) {
  try {
    broadcastToAll('market-data:job:update', serializeJob(job));
  } catch {
    // broadcast failure must never abort the import loop
  }
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

// ---------------------------------------------------------------------------
// getStats — unchanged shape from the previous version.
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

// ---------------------------------------------------------------------------
// Async import jobs
// ---------------------------------------------------------------------------

async function computeMissingChunks(symbol, interval, from, to) {
  const allChunks = getChunks(from, to, interval);
  const coverage = await prisma.marketBarCoverage.findUnique({
    where: { symbol_interval: { symbol, interval } },
  });

  if (!coverage) return { missing: allChunks, skipped: 0 };

  const covFrom = coverage.fromTime.getTime();
  const covTo = coverage.toTime.getTime();

  // Front/back gap detection: only skips chunks that sit entirely outside
  // the already-covered range. Interior gaps (rare — job aborts on first
  // hard failure) are not filled. To refill interior gaps, wipe + reimport.
  const missing = allChunks.filter((c) => {
    const cFrom = c.from.getTime();
    const cTo = c.to.getTime();
    if (cTo <= covFrom) return true;  // entirely before coverage
    if (cFrom >= covTo) return true;  // entirely after coverage
    return false;                     // overlaps coverage → skip
  });

  return { missing, skipped: allChunks.length - missing.length };
}

export async function startImportJob({ symbol, interval, from, to, actor }) {
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
  const fetchFn = PROVIDER_FETCHERS[resolved.provider];
  if (!fetchFn) throw new HttpError(500, `No provider fetcher for ${resolved.provider}`);

  const sym = symbol.toUpperCase();
  const key = jobKey(sym, interval);

  // One job per (symbol, interval) at a time.
  if (activeKeys.has(key)) {
    throw new HttpError(409, `An import for ${sym} · ${interval} is already running.`);
  }
  // Global cap.
  if (running.size >= MAX_CONCURRENT_JOBS) {
    throw new HttpError(429, `Maximum ${MAX_CONCURRENT_JOBS} imports running. Stop one first.`);
  }

  const { missing, skipped } = await computeMissingChunks(sym, interval, fromDate, toDate);

  if (missing.length > MAX_CHUNKS_PER_JOB) {
    throw new HttpError(
      400,
      `Range too large — ${missing.length} chunks needed (max ${MAX_CHUNKS_PER_JOB}). Split the range.`
    );
  }

  const alreadyComplete = missing.length === 0;

  const job = await prisma.marketImportJob.create({
    data: {
      symbol: sym,
      interval,
      fromTime: fromDate,
      toTime: toDate,
      status: alreadyComplete ? 'completed' : 'running',
      totalChunks: missing.length,
      chunksDone: 0,
      fetched: 0,
      inserted: 0,
      startedById: actor.id,
      finishedAt: alreadyComplete ? new Date() : null,
    },
  });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'market-data.import.start',
    targetType: 'market_import_job',
    targetId: job.id,
    metadata: {
      symbol: sym,
      interval,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      totalChunks: missing.length,
      skippedChunks: skipped,
      alreadyComplete,
    },
    req: actor.req,
  });

  broadcastJob(job);

  if (alreadyComplete) {
    return { jobId: job.id, totalChunks: 0, skippedChunks: skipped, alreadyComplete: true };
  }

  running.set(job.id, { stopped: false });
  activeKeys.set(key, job.id);

  // Kick off OUTSIDE the HTTP lifecycle.
  setImmediate(() => {
    runImportJob(job.id, missing, resolved, fetchFn).catch((err) => {
      console.error(`[market-data] job runner crashed: ${job.id}`, err);
    });
  });

  return { jobId: job.id, totalChunks: missing.length, skippedChunks: skipped };
}

async function runImportJob(jobId, chunks, resolved, fetchFn) {
  const reg = running.get(jobId);
  if (!reg) return; // already stopped before the loop even started

  const initial = await prisma.marketImportJob.findUnique({ where: { id: jobId } });
  if (!initial) { running.delete(jobId); return; }

  const { symbol, interval } = initial;
  const startedAt = Date.now();

  let chunksDone = initial.chunksDone;
  let fetched = initial.fetched;
  let inserted = initial.inserted;
  let finalStatus = 'completed';
  let lastError = null;

  // Self-ping — keeps Render free tier awake during long imports. Opt-in.
  const keepAliveHandle = setInterval(() => {
    if (process.env.MARKET_DATA_KEEPALIVE !== 'true') return;
    const port = process.env.PORT || 4000;
    fetch(`http://127.0.0.1:${port}/api/health`).catch(() => {});
  }, KEEPALIVE_INTERVAL_MS);
  keepAliveHandle.unref?.();

  let lastDbStopCheck = -1;

  try {
    for (let i = 0; i < chunks.length; i++) {
      // ---- Stop check (in-memory fast path) ----
      if (reg.stopped) { finalStatus = 'stopped'; break; }

      // ---- Stop check (DB, every N chunks — multi-instance safety) ----
      if (chunksDone - lastDbStopCheck >= DB_STOP_CHECK_EVERY_N_CHUNKS) {
        lastDbStopCheck = chunksDone;
        const fresh = await prisma.marketImportJob.findUnique({
          where: { id: jobId },
          select: { stopRequested: true },
        });
        if (fresh?.stopRequested) { finalStatus = 'stopped'; break; }
      }

      // ---- Duration cap ----
      if (Date.now() - startedAt > MAX_JOB_DURATION_MS) {
        finalStatus = 'failed';
        lastError = `Job exceeded max duration (${MAX_JOB_DURATION_MS / 60000} min).`;
        break;
      }

      const chunk = chunks[i];
      let chunkOk = false;
      let chunkError = null;

      // Retry chain per chunk.
      for (let attempt = 0; attempt <= CHUNK_RETRY_BACKOFF_MS.length; attempt++) {
        if (reg.stopped) break;
        try {
          const rawBars = await fetchFn(resolved.providerSymbol, interval, {
            from: chunk.from,
            to: chunk.to,
          });
          fetched += rawBars.length;
          if (rawBars.length > 0) {
            inserted += await bulkUpsertBars(symbol, interval, resolved.provider, rawBars);
          }
          await recomputeCoverage(symbol, interval, resolved.provider, resolved.providerSymbol);
          chunkOk = true;
          break;
        } catch (err) {
          chunkError = err;
          const isRate = err?.status === 429;
          const backoffMs = isRate
            ? Math.max(5000, Math.min(60000, 15000 * (attempt + 1)))
            : (CHUNK_RETRY_BACKOFF_MS[attempt] || 5000);

          if (attempt < CHUNK_RETRY_BACKOFF_MS.length) {
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }

          // Out of retries — write provider cooldown, mark job failed.
          const backoffUntil = new Date(Date.now() + (isRate ? 5 * 60_000 : 60_000));
          await prisma.marketBarCoverage.upsert({
            where: { symbol_interval: { symbol, interval } },
            create: {
              symbol, interval,
              provider: resolved.provider,
              providerSymbol: resolved.providerSymbol,
              fromTime: chunk.from, toTime: chunk.from,
              backoffUntil,
              lastError: err.message,
            },
            update: { backoffUntil, lastError: err.message },
          });
        }
      }

      if (!chunkOk) {
        finalStatus = 'failed';
        lastError = chunkError?.message || 'Unknown chunk error';
        break;
      }

      chunksDone += 1;

      const updated = await prisma.marketImportJob.update({
        where: { id: jobId },
        data: { chunksDone, fetched, inserted },
      });
      broadcastJob(updated);
    }
  } catch (err) {
    finalStatus = 'failed';
    lastError = err?.message || String(err);
  } finally {
    clearInterval(keepAliveHandle);

    let final = null;
    try {
      final = await prisma.marketImportJob.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          chunksDone,
          fetched,
          inserted,
          lastError,
          finishedAt: new Date(),
        },
      });
    } catch (err) {
      console.error(`[market-data] final update failed for ${jobId}:`, err);
    }

    running.delete(jobId);
    activeKeys.delete(jobKey(symbol, interval));

    if (final) broadcastJob(final);

    try {
      await writeAudit({
        actorId: initial.startedById,
        actorEmail: '',
        action: `market-data.import.${finalStatus}`,
        targetType: 'market_import_job',
        targetId: jobId,
        metadata: {
          symbol, interval,
          totalChunks: initial.totalChunks,
          chunksDone, fetched, inserted, lastError,
        },
      });
    } catch {}
  }
}

export async function listJobs({ limit = 50 } = {}) {
  const take = Math.min(Math.max(1, Number(limit) || 50), 200);
  const rows = await prisma.marketImportJob.findMany({
    orderBy: { startedAt: 'desc' },
    take,
  });
  return rows.map(serializeJob);
}

export async function getJob(jobId) {
  const row = await prisma.marketImportJob.findUnique({ where: { id: jobId } });
  if (!row) throw new HttpError(404, 'Job not found');
  return serializeJob(row);
}

export async function stopJob(jobId, actor) {
  const job = await prisma.marketImportJob.findUnique({ where: { id: jobId } });
  if (!job) throw new HttpError(404, 'Job not found');
  if (job.status !== 'running') {
    return { ok: true, alreadyStopped: true, status: job.status };
  }

  // Fast path.
  const reg = running.get(jobId);
  if (reg) reg.stopped = true;

  // DB flag (multi-instance safety).
  await prisma.marketImportJob.update({
    where: { id: jobId },
    data: { stopRequested: true },
  });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'market-data.import.stop',
    targetType: 'market_import_job',
    targetId: jobId,
    metadata: { symbol: job.symbol, interval: job.interval },
    req: actor.req,
  });

  return { ok: true, status: 'stopping' };
}

export async function markInterruptedJobs() {
  const res = await prisma.marketImportJob.updateMany({
    where: { status: { in: ['running', 'stopping'] } },
    data: { status: 'interrupted', finishedAt: new Date() },
  });
  if (res.count > 0) {
    console.log(`[market-data] boot sweep: marked ${res.count} stale job(s) as interrupted`);
  }
  return res.count;
}

// ---------------------------------------------------------------------------
// wipeCache — unchanged behavior. Group wipe passes interval=undefined.
// ---------------------------------------------------------------------------

export async function wipeCache({ symbol, interval, actor }) {
  if (!symbol) throw new HttpError(400, 'symbol is required');
  const sym = String(symbol).toUpperCase();

  const where = { symbol: sym };
  if (interval) where.interval = interval;

  const del = await prisma.marketBar.deleteMany({ where });
  await prisma.marketBarCoverage.deleteMany({ where });

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
