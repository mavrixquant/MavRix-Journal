// apps/api/src/lib/calendarSync.js
//
// Background polling service that syncs the Biquote economic calendar
// into the local Prisma cache.
//
// Design:
//   - Fetches in weekly chunks. Biquote caps a single request at 500 events,
//     so a monolithic 75-day request only ever returns the first 500 rows and
//     silently ignores the rest. Chunking guarantees full coverage.
//   - Batched upsert: one query to find existing externalIds, one createMany
//     for new rows, one transaction only for rows whose actual/forecast/previous
//     actually changed. Drops ~1,000 queries per cycle to ~3.
//   - Recursive setTimeout scheduling: next sync fires *after* the current one
//     finishes, so a slow cycle cannot cause overlaps.
//   - Per-request AbortController timeout so a hung Biquote response cannot
//     stall the loop.
//   - Broadcasts an SSE `invalidate` with [['calendar']] after a sync that
//     changed at least one row.
//   - Prunes rows older than `backwardDays` on each successful sync.

import { prisma } from './prisma.js';
import { broadcastToUser } from './broadcaster.js';

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

function getConfig() {
  return {
    enabled: process.env.CALENDAR_SYNC_ENABLED !== 'false',
    intervalMs: Number(process.env.CALENDAR_SYNC_INTERVAL_MS || 60_000),
    forwardDays: Number(process.env.CALENDAR_FORWARD_DAYS || 45),
    backwardDays: Number(process.env.CALENDAR_BACKWARD_DAYS || 30),
    chunkDays: Number(process.env.CALENDAR_CHUNK_DAYS || 7),
    fetchTimeoutMs: Number(process.env.CALENDAR_FETCH_TIMEOUT_MS || 15_000),
    baseUrl: process.env.BIQUOTE_BASE_URL || 'https://biquote.io',
  };
}

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

function deriveDateParts(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return {
      dateTimeUtc: now,
      date: isoDate(now),
      timeUtc: '00:00',
    };
  }
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return {
    dateTimeUtc: d,
    date: isoDate(d),
    timeUtc: `${hh}:${mm}`,
  };
}

function nullIfEmpty(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/* ------------------------------------------------------------------ */
/*  Biquote fetch                                                      */
/* ------------------------------------------------------------------ */

async function fetchCalendarRange(fromIso, toIso, baseUrl, timeoutMs) {
  const url =
    `${baseUrl}/api/calendar` +
    `?from=${encodeURIComponent(fromIso)}` +
    `&to=${encodeURIComponent(toIso)}` +
    `&limit=500`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Biquote request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after') || 60);
    const err = new Error(`Biquote rate-limited; retry after ${retryAfter}s`);
    err.retryAfterMs = retryAfter * 1000;
    throw err;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Biquote ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('Biquote returned non-array payload');
  }
  return data;
}

/**
 * Walk the full [from, to] range in `chunkDays`-sized slices.
 * Dedupes by `id` in case chunk boundaries overlap.
 */
async function fetchAllChunks(fromDate, toDate, cfg) {
  const allRows = [];
  const seen = new Set();

  let cursor = new Date(fromDate);
  const end = new Date(toDate);

  let chunkIndex = 0;
  while (cursor <= end) {
    chunkIndex++;
    const chunkEndRaw = addDays(cursor, cfg.chunkDays - 1);
    const chunkEnd = chunkEndRaw > end ? end : chunkEndRaw;

    const rows = await fetchCalendarRange(
      isoDate(cursor),
      isoDate(chunkEnd),
      cfg.baseUrl,
      cfg.fetchTimeoutMs
    );

    for (const row of rows) {
      if (!row || !row.id) continue;
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      allRows.push(row);
    }

    cursor = addDays(chunkEnd, 1);
  }

  return { rows: allRows, chunks: chunkIndex };
}

/* ------------------------------------------------------------------ */
/*  Row mapping                                                        */
/* ------------------------------------------------------------------ */

function mapBiquoteRow(row) {
  const externalId = nullIfEmpty(row.id);
  if (!externalId) return null;

  const { date, timeUtc, dateTimeUtc } = deriveDateParts(row.time);
  const impact = (row.importance || 'low').toLowerCase();

  return {
    externalId,
    eventId: nullIfEmpty(row.eventId),
    date,
    timeUtc,
    dateTimeUtc,
    period: row.period ? new Date(row.period) : null,
    countryCode: (row.countryCode || '').toUpperCase(),
    currency: (row.currency || '').toUpperCase(),
    event: row.name || '(unnamed event)',
    impact,
    eventType: nullIfEmpty(row.type),
    sector: nullIfEmpty(row.sector),
    unit: nullIfEmpty(row.unit),
    multiplier: nullIfEmpty(row.multiplier),
    digits: Number.isFinite(row.digits) ? Number(row.digits) : null,
    actual: nullIfEmpty(row.actual),
    forecast: nullIfEmpty(row.forecast),
    previous: nullIfEmpty(row.previous),
    revisedPrevious: nullIfEmpty(row.revisedPrevious),
    revision: Number.isFinite(row.revision) ? Number(row.revision) : null,
    timeMode: nullIfEmpty(row.timeMode),
    sourceUrl: nullIfEmpty(row.sourceUrl),
    source: nullIfEmpty(row.source) || 'unknown',
  };
}

/* ------------------------------------------------------------------ */
/*  Batched upsert                                                     */
/* ------------------------------------------------------------------ */

async function upsertEventsBatched(rows) {
  if (rows.length === 0) return { created: 0, updated: 0 };

  // Map & drop rows without a stable externalId.
  const mapped = [];
  const seen = new Set();
  for (const row of rows) {
    const m = mapBiquoteRow(row);
    if (!m) continue;
    if (seen.has(m.externalId)) continue;
    seen.add(m.externalId);
    mapped.push(m);
  }
  if (mapped.length === 0) return { created: 0, updated: 0 };

  // One query: existing externalIds in this batch, with the three fields
  // whose change drives the SSE invalidate.
  const externalIds = mapped.map((m) => m.externalId);
  const existing = await prisma.economicEvent.findMany({
    where: { externalId: { in: externalIds } },
    select: {
      externalId: true,
      actual: true,
      forecast: true,
      previous: true,
    },
  });
  const existingMap = new Map(existing.map((e) => [e.externalId, e]));

  const toCreate = [];
  const toUpdate = [];

  for (const m of mapped) {
    const prev = existingMap.get(m.externalId);
    if (!prev) {
      toCreate.push(m);
    } else {
      const materialChange =
        prev.actual !== m.actual ||
        prev.forecast !== m.forecast ||
        prev.previous !== m.previous;
      if (materialChange) toUpdate.push(m);
    }
  }

  // Batch insert new rows in one statement.
  let created = 0;
  if (toCreate.length > 0) {
    const now = new Date();
    const result = await prisma.economicEvent.createMany({
      data: toCreate.map((m) => ({ ...m, fetchedAt: now })),
      skipDuplicates: true,
    });
    created = result.count;
  }

  // Only material changes go through the update transaction. In steady state
  // this is near-zero — most events are future-dated with null actuals.
  let updated = 0;
  if (toUpdate.length > 0) {
    const now = new Date();
    await prisma.$transaction(
      toUpdate.map((m) =>
        prisma.economicEvent.update({
          where: { externalId: m.externalId },
          data: { ...m, fetchedAt: now },
        })
      )
    );
    updated = toUpdate.length;
  }

  return { created, updated };
}

async function pruneOldEvents(backwardDays) {
  const cutoff = addDays(new Date(), -backwardDays);
  const result = await prisma.economicEvent.deleteMany({
    where: { dateTimeUtc: { lt: cutoff } },
  });
  return result.count;
}

/* ------------------------------------------------------------------ */
/*  Single sync cycle                                                  */
/* ------------------------------------------------------------------ */

let syncInFlight = false;

export async function runCalendarSyncOnce() {
  if (syncInFlight) {
    return { skipped: true, reason: 'sync already in flight' };
  }
  syncInFlight = true;

  const cfg = getConfig();
  const startedAt = Date.now();

  try {
    const from = addDays(new Date(), -cfg.backwardDays);
    const to = addDays(new Date(), cfg.forwardDays);

    const { rows, chunks } = await fetchAllChunks(from, to, cfg);
    const { created, updated } = await upsertEventsBatched(rows);
    const pruned = await pruneOldEvents(cfg.backwardDays);

    if (created > 0 || updated > 0) {
      broadcastToUser('__all__', 'invalidate', { keys: [['calendar']] });
    }

    const elapsed = Date.now() - startedAt;
    console.log(
      `[calendar] sync ok — chunks=${chunks} fetched=${rows.length} created=${created} updated=${updated} pruned=${pruned} in ${elapsed}ms`
    );

    return {
      ok: true,
      chunks,
      fetched: rows.length,
      created,
      updated,
      pruned,
      elapsedMs: elapsed,
    };
  } catch (err) {
    console.error('[calendar] sync failed:', err.message);
    return {
      ok: false,
      error: err.message,
      retryAfterMs: err.retryAfterMs || null,
    };
  } finally {
    syncInFlight = false;
  }
}

/* ------------------------------------------------------------------ */
/*  Recursive scheduling                                               */
/* ------------------------------------------------------------------ */

let running = false;
let currentTimeoutHandle = null;
let consecutiveFailures = 0;

async function tick() {
  if (!running) return;

  const res = await runCalendarSyncOnce();

  if (res?.ok) {
    consecutiveFailures = 0;
  } else {
    consecutiveFailures++;
    const backoffMs = Math.min(300_000, 30_000 * consecutiveFailures);
    console.warn(
      `[calendar] ${consecutiveFailures} consecutive failures — next retry in ~${Math.round(backoffMs / 1000)}s`
    );
  }

  if (!running) return;

  const cfg = getConfig();
  // After a failure, wait the backoff; otherwise wait the normal interval.
  const delay =
    res?.ok
      ? cfg.intervalMs
      : Math.min(300_000, 30_000 * consecutiveFailures);

  currentTimeoutHandle = setTimeout(tick, delay);
}

export function startCalendarSync() {
  const cfg = getConfig();

  if (!cfg.enabled) {
    console.log('[calendar] sync disabled via CALENDAR_SYNC_ENABLED=false');
    return;
  }

  if (running) {
    console.log('[calendar] sync already running; ignoring start()');
    return;
  }

  running = true;
  consecutiveFailures = 0;

  console.log(
    `[calendar] sync started — interval ${cfg.intervalMs}ms, chunk ${cfg.chunkDays}d, ` +
      `window -${cfg.backwardDays}d/+${cfg.forwardDays}d`
  );

  // Kick off the first cycle immediately.
  tick();
}

export function stopCalendarSync() {
  if (!running) return;
  running = false;
  if (currentTimeoutHandle) {
    clearTimeout(currentTimeoutHandle);
    currentTimeoutHandle = null;
  }
  console.log('[calendar] sync stopped');
}