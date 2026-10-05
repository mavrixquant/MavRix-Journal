// apps/api/src/services/gex.service.js
//
// User-side GEX read service. Returns day-level metadata for the date list
// and full levels payload for the selected day.
//
// Read-only — no audit, no mutations. Everything here is safe to call from
// any authenticated user.

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';

/* ------------------------------------------------------------------ */
/*  Serializers                                                        */
/* ------------------------------------------------------------------ */

// Compact shape for the date-list panel. Deliberately excludes `levels`
// and `converted` — those can be tens of KB per day and are only needed
// for the currently-selected date.
const serializeListItem = (row) => ({
  date: row.date,
  levelCount: row.levelCount,
  blCount: row.blCount,
  gexCount: row.gexCount,
  otherCount: row.otherCount,
  uploadedAt: row.updatedAt,
});

// Full shape for the detail view (chart + converted string).
const serializeFull = (row) => ({
  id: row.id,
  date: row.date,
  levels: row.levels,
  converted: row.converted,
  levelCount: row.levelCount,
  blCount: row.blCount,
  gexCount: row.gexCount,
  otherCount: row.otherCount,
  sourceTimezone: row.sourceTimezone,
  createdAt: row.createdAt,
  uploadedAt: row.updatedAt,
});

/* ------------------------------------------------------------------ */
/*  Reads                                                              */
/* ------------------------------------------------------------------ */

/**
 * List every uploaded GEX day, newest first.
 *
 * No pagination in v1 — the sidebar virtualizes if the list grows large,
 * and 500 days of metadata is < 100 KB.
 */
export async function listGexDays() {
  const rows = await prisma.gexDay.findMany({
    orderBy: { date: 'desc' },
  });
  return rows.map(serializeListItem);
}

/**
 * Fetch a single day's full payload.
 * Throws 404 if the date has no uploaded data.
 */
export async function getGexDay(date) {
  const row = await prisma.gexDay.findUnique({ where: { date } });
  if (!row) throw new HttpError(404, `No GEX data for ${date}`);
  return serializeFull(row);
}