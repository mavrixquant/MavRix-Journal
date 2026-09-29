// apps/api/src/services/calendar.service.js
//
// Read-side service. Always reads from the local Prisma cache.
// The background sync in lib/calendarSync.js keeps the cache fresh.
// This service never blocks on a network call to Biquote.

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';

const serialize = (e) => ({
  id: e.id,
  externalId: e.externalId,
  eventId: e.eventId,
  date: e.date,
  timeUtc: e.timeUtc,
  dateTimeUtc: e.dateTimeUtc,
  period: e.period,
  countryCode: e.countryCode,
  currency: e.currency,
  event: e.event,
  impact: e.impact,
  eventType: e.eventType,
  sector: e.sector,
  unit: e.unit,
  multiplier: e.multiplier,
  digits: e.digits,
  actual: e.actual,
  forecast: e.forecast,
  previous: e.previous,
  revisedPrevious: e.revisedPrevious,
  revision: e.revision,
  timeMode: e.timeMode,
  sourceUrl: e.sourceUrl,
  source: e.source,
});

export async function listEvents({
  from,
  to,
  currencies = [],
  impacts = [],
  limit = 500,
} = {}) {
  if (!from || !to) {
    throw new HttpError(400, 'from and to date params are required (YYYY-MM-DD)');
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new HttpError(400, 'from and to must be valid ISO dates');
  }
  if (fromDate > toDate) {
    throw new HttpError(400, 'from must be <= to');
  }

  const where = {
    dateTimeUtc: { gte: fromDate, lte: toDate },
  };

  if (currencies.length > 0) {
    where.currency = { in: currencies.map((c) => c.toUpperCase()) };
  }
  if (impacts.length > 0) {
    where.impact = { in: impacts.map((i) => i.toLowerCase()) };
  }

  const events = await prisma.economicEvent.findMany({
    where,
    orderBy: [{ dateTimeUtc: 'asc' }],
    take: Math.min(Number(limit) || 500, 500),
  });

  return events.map(serialize);
}

export async function getEventById(id) {
  const event = await prisma.economicEvent.findUnique({ where: { id } });
  if (!event) throw new HttpError(404, 'Economic event not found');
  return serialize(event);
}

export async function listCurrencies() {
  // Distinct currency codes present in the cache, with counts and
  // min/max dates. Powers the filter dropdown in the UI.
  const rows = await prisma.economicEvent.groupBy({
    by: ['currency'],
    _count: { _all: true },
    _min: { dateTimeUtc: true },
    _max: { dateTimeUtc: true },
    orderBy: { currency: 'asc' },
  });

  return rows.map((r) => ({
    currency: r.currency,
    count: r._count._all,
    firstEventAt: r._min.dateTimeUtc,
    lastEventAt: r._max.dateTimeUtc,
  }));
}

export async function getCalendarMeta() {
  // Lightweight metadata for the UI header: total events, date span,
  // last sync timestamp.
  const [count, minRow, maxRow] = await Promise.all([
    prisma.economicEvent.count(),
    prisma.economicEvent.findFirst({
      orderBy: { dateTimeUtc: 'asc' },
      select: { dateTimeUtc: true },
    }),
    prisma.economicEvent.findFirst({
      orderBy: { dateTimeUtc: 'desc' },
      select: { dateTimeUtc: true },
    }),
  ]);

  return {
    totalEvents: count,
    earliestEventAt: minRow?.dateTimeUtc ?? null,
    latestEventAt: maxRow?.dateTimeUtc ?? null,
  };
}