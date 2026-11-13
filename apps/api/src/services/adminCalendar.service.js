// ============================================================================
// Admin calendar service — view / sync / import / delete economic events.
//
// Backs every /api/admin/calendar/* route. Delegates actual fetching to
// lib/calendarSync.js so both auto-sync and admin range-sync share the same
// provider plumbing.
// ============================================================================

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../lib/audit.js';
import { broadcastToAll } from '../lib/broadcaster.js';
import { runCalendarSyncOnce } from '../lib/calendarSync.js';
import { isHealthCheckActive } from '../lib/healthCheckMode.js';

const VALID_IMPACTS = ['high', 'medium', 'low'];

function buildWhere({ q, currency, impact, from, to } = {}) {
  const where = {};

  if (q && String(q).trim()) {
    where.OR = [
      { event: { contains: String(q).trim(), mode: 'insensitive' } },
      { currency: { contains: String(q).trim(), mode: 'insensitive' } },
      { countryCode: { contains: String(q).trim(), mode: 'insensitive' } },
    ];
  }

  if (currency && String(currency).trim()) {
    where.currency = String(currency).trim().toUpperCase();
  }
  if (impact && VALID_IMPACTS.includes(impact)) {
    where.impact = impact;
  }

  if (from || to) {
    where.dateTimeUtc = {};
    if (from) {
      const d = new Date(from);
      if (Number.isNaN(d.getTime())) throw new HttpError(400, 'from must be a valid date');
      where.dateTimeUtc.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (Number.isNaN(d.getTime())) throw new HttpError(400, 'to must be a valid date');
      where.dateTimeUtc.lte = d;
    }
  }

  return where;
}

const serialize = (e) => ({
  id: e.id,
  externalId: e.externalId,
  eventId: e.eventId,
  date: e.date,
  timeUtc: e.timeUtc,
  dateTimeUtc: e.dateTimeUtc,
  countryCode: e.countryCode,
  currency: e.currency,
  event: e.event,
  impact: e.impact,
  eventType: e.eventType,
  sector: e.sector,
  unit: e.unit,
  actual: e.actual,
  forecast: e.forecast,
  previous: e.previous,
  revisedPrevious: e.revisedPrevious,
  sourceUrl: e.sourceUrl,
  source: e.source,
  fetchedAt: e.fetchedAt,
  updatedAt: e.updatedAt,
});

export async function listEvents({ page = 1, limit = 50, q, currency, impact, from, to } = {}) {
  const take = Math.min(Math.max(1, Number(limit) || 50), 500);
  const skip = (Math.max(1, Number(page) || 1) - 1) * take;
  const where = buildWhere({ q, currency, impact, from, to });

  const [rows, total] = await Promise.all([
    prisma.economicEvent.findMany({
      where,
      orderBy: { dateTimeUtc: 'desc' },
      skip,
      take,
    }),
    prisma.economicEvent.count({ where }),
  ]);

  return {
    events: rows.map(serialize),
    total,
    page: Math.max(1, Number(page) || 1),
    limit: take,
    pages: Math.max(1, Math.ceil(total / take)),
  };
}

export async function getEvent(id) {
  const row = await prisma.economicEvent.findUnique({ where: { id } });
  if (!row) throw new HttpError(404, 'Event not found');
  return serialize(row);
}

export async function getStats() {
  const [total, byImpact, byCurrency, minRow, maxRow] = await Promise.all([
    prisma.economicEvent.count(),
    prisma.economicEvent.groupBy({ by: ['impact'], _count: { _all: true } }),
    prisma.economicEvent.groupBy({
      by: ['currency'],
      _count: { _all: true },
      orderBy: { _count: { currency: 'desc' } },
      take: 30,
    }),
    prisma.economicEvent.findFirst({
      orderBy: { dateTimeUtc: 'asc' },
      select: { dateTimeUtc: true },
    }),
    prisma.economicEvent.findFirst({
      orderBy: { dateTimeUtc: 'desc' },
      select: { dateTimeUtc: true },
    }),
  ]);

  const impactCounts = { high: 0, medium: 0, low: 0 };
  for (const g of byImpact) {
    if (g.impact in impactCounts) impactCounts[g.impact] = g._count._all;
  }

  return {
    total,
    impactCounts,
    currencyCounts: byCurrency.map((g) => ({ currency: g.currency, count: g._count._all })),
    earliestEventAt: minRow?.dateTimeUtc ?? null,
    latestEventAt: maxRow?.dateTimeUtc ?? null,
  };
}

export async function syncRange(actor, { from, to } = {}) {
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  if (fromDate && Number.isNaN(fromDate.getTime())) {
    throw new HttpError(400, '"from" must be a valid ISO date');
  }
  if (toDate && Number.isNaN(toDate.getTime())) {
    throw new HttpError(400, '"to" must be a valid ISO date');
  }
  if (fromDate && toDate && fromDate >= toDate) {
    throw new HttpError(400, '"from" must be before "to"');
  }
  if (fromDate && toDate) {
    const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000);
    if (days > 365) throw new HttpError(400, 'Date range too large (max 365 days)');
  }

  const startedAt = Date.now();
  let result;
  try {
    result = await runCalendarSyncOnce({ fromDate, toDate });
  } catch (err) {
    await writeAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'calendar.sync-range',
      targetType: 'system',
      metadata: { from, to, ok: false, error: err.message },
      req: actor.req,
    });
    throw new HttpError(500, 'Calendar sync failed: ' + err.message);
  }

  const elapsedMs = Date.now() - startedAt;
  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'calendar.sync-range',
    targetType: 'system',
    metadata: { from, to, ok: true, elapsedMs, result },
    req: actor.req,
  });

  if (result && ((result.created || 0) > 0 || (result.updated || 0) > 0)) {
    broadcastToAll('invalidate', { keys: [['calendar']] });
  }

  return { ok: true, elapsedMs, result };
}

export async function importEvents(actor, { rows, mode = 'merge' } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new HttpError(400, 'rows must be a non-empty array');
  }
  if (!['merge', 'replace'].includes(mode)) {
    throw new HttpError(400, 'mode must be "merge" or "replace"');
  }
  if (rows.length > 50_000) {
    throw new HttpError(400, 'Too many rows in one import (max 50,000)');
  }

  const prepared = [];
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      if (!r || typeof r !== 'object') throw new Error('not an object');

      const dt = r.dateTimeUtc ? new Date(r.dateTimeUtc) : null;
      if (!dt || Number.isNaN(dt.getTime())) throw new Error('invalid dateTimeUtc');

      const externalId = String(r.externalId || '').trim();
      if (!externalId) throw new Error('missing externalId');

      prepared.push({
        externalId,
        eventId: r.eventId ? String(r.eventId) : null,
        date: r.date || dt.toISOString().slice(0, 10),
        timeUtc:
          r.timeUtc ||
          String(dt.getUTCHours()).padStart(2, '0') + ':' + String(dt.getUTCMinutes()).padStart(2, '0'),
        dateTimeUtc: dt,
        period: r.period ? new Date(r.period) : null,
        countryCode: String(r.countryCode || '').toUpperCase(),
        currency: String(r.currency || '').toUpperCase(),
        event: String(r.event || '(unnamed event)'),
        impact: VALID_IMPACTS.includes(String(r.impact).toLowerCase())
          ? String(r.impact).toLowerCase()
          : 'low',
        eventType: r.eventType ? String(r.eventType) : null,
        sector: r.sector ? String(r.sector) : null,
        unit: r.unit ? String(r.unit) : null,
        multiplier: r.multiplier ? String(r.multiplier) : null,
        digits: Number.isFinite(Number(r.digits)) ? Number(r.digits) : null,
        actual: r.actual != null && r.actual !== '' ? String(r.actual) : null,
        forecast: r.forecast != null && r.forecast !== '' ? String(r.forecast) : null,
        previous: r.previous != null && r.previous !== '' ? String(r.previous) : null,
        revisedPrevious:
          r.revisedPrevious != null && r.revisedPrevious !== '' ? String(r.revisedPrevious) : null,
        revision: Number.isFinite(Number(r.revision)) ? Number(r.revision) : null,
        timeMode: r.timeMode ? String(r.timeMode) : null,
        sourceUrl: r.sourceUrl ? String(r.sourceUrl) : null,
        source: String(r.source || 'import'),
      });
    } catch (err) {
      if (errors.length < 20) errors.push('Row ' + (i + 1) + ': ' + err.message);
    }
  }

  if (prepared.length === 0) {
    throw new HttpError(400, 'No valid rows. First errors: ' + errors.join(' | '));
  }

  const cleared = mode === 'replace' ? (await prisma.economicEvent.deleteMany({})).count : 0;

  const byId = new Map();
  for (const p of prepared) byId.set(p.externalId, p);
  const unique = [...byId.values()];

  let created = 0;
  let updated = 0;
  const CHUNK = 500;

  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const existing = await prisma.economicEvent.findMany({
      where: { externalId: { in: chunk.map((r) => r.externalId) } },
      select: { externalId: true },
    });
    const existingSet = new Set(existing.map((e) => e.externalId));

    const toCreate = chunk.filter((r) => !existingSet.has(r.externalId));
    const toUpdate = chunk.filter((r) => existingSet.has(r.externalId));

    if (toCreate.length > 0) {
      const res = await prisma.economicEvent.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
      created += res.count;
    }

    for (const row of toUpdate) {
      await prisma.economicEvent.update({
        where: { externalId: row.externalId },
        data: { ...row, fetchedAt: new Date() },
      });
      updated += 1;
    }
  }

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'calendar.import',
    targetType: 'system',
    metadata: {
      mode,
      rowCount: rows.length,
      validCount: unique.length,
      created,
      updated,
      cleared,
      sampleErrors: errors,
    },
    req: actor.req,
  });

  if (!isHealthCheckActive() && (created > 0 || updated > 0 || cleared > 0)) {
    broadcastToAll('invalidate', { keys: [['calendar']] });
  }

  return { ok: true, mode, created, updated, cleared, valid: unique.length, errors };
}

export async function deleteEvents(actor, { ids, currency, impact, from, to, all } = {}) {
  const where = {};

  if (Array.isArray(ids) && ids.length > 0) {
    where.id = { in: ids.map(String) };
  } else if (all === true) {
    // delete everything — allowed but requires `all: true` explicitly
  } else {
    if (currency && String(currency).trim()) {
      where.currency = String(currency).trim().toUpperCase();
    }
    if (impact && VALID_IMPACTS.includes(impact)) {
      where.impact = impact;
    }
    if (from || to) {
      where.dateTimeUtc = {};
      if (from) {
        const d = new Date(from);
        if (Number.isNaN(d.getTime())) throw new HttpError(400, '"from" must be a valid date');
        where.dateTimeUtc.gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (Number.isNaN(d.getTime())) throw new HttpError(400, '"to" must be a valid date');
        where.dateTimeUtc.lte = d;
      }
    }
    if (Object.keys(where).length === 0) {
      throw new HttpError(
        400,
        'Refusing to delete without a filter. Pass { all: true } to wipe everything.'
      );
    }
  }

  const res = await prisma.economicEvent.deleteMany({ where });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'calendar.delete',
    targetType: 'system',
    metadata: {
      filter: {
        idsCount: Array.isArray(ids) ? ids.length : 0,
        currency,
        impact,
        from,
        to,
        all: all === true,
      },
      deleted: res.count,
    },
    req: actor.req,
  });

  if (res.count > 0) {
    broadcastToAll('invalidate', { keys: [['calendar']] });
  }

  return { ok: true, deleted: res.count };
}
