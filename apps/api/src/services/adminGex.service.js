// apps/api/src/services/adminGex.service.js
//
// Admin-side GEX service. Adds:
//   - upsert with 409-on-duplicate (client confirms overwrite)
//   - server-side integrity check on the `converted` pipe-string
//   - audit-log writes on every mutation
//
// The integrity check matters: `converted` is what the user will paste
// into TradingView. If the client ever corrupted it — through a bug or a
// tampered request — we'd ship bad data silently. Re-serializing the
// `levels` array and comparing guarantees the two halves agree.

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../lib/audit.js';
import {
  serializeGexLevels,
  GEX_DEFAULT_TIMEZONE,
} from '@mavrix/shared';

/* ------------------------------------------------------------------ */
/*  Serializers                                                        */
/* ------------------------------------------------------------------ */

// Admin list item includes the uploader for the management table.
const serializeListItem = (row) => ({
  date: row.date,
  levelCount: row.levelCount,
  blCount: row.blCount,
  gexCount: row.gexCount,
  otherCount: row.otherCount,
  uploadedBy: row.uploadedBy,
  uploadedAt: row.updatedAt,
  createdAt: row.createdAt,
});

// Full shape mirrors the user-side full serializer, plus uploader info.
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
  uploadedBy: row.uploadedBy,
  createdAt: row.createdAt,
  uploadedAt: row.updatedAt,
});

/* ------------------------------------------------------------------ */
/*  List                                                               */
/* ------------------------------------------------------------------ */

export async function listAdminGexDays() {
  const rows = await prisma.gexDay.findMany({
    orderBy: { date: 'desc' },
  });
  return rows.map(serializeListItem);
}

/* ------------------------------------------------------------------ */
/*  Upsert                                                             */
/* ------------------------------------------------------------------ */

/**
 * Create or overwrite a GEX day.
 *
 * @param {object} actor    — { id, email, role, req }
 * @param {object} payload  — { date, levels, converted, sourceTimezone? }
 * @param {object} opts
 * @param {boolean} opts.overwrite — if false and the date exists, throws 409
 */
export async function upsertGexDay(actor, payload, { overwrite = false } = {}) {
  const { date, levels, converted, sourceTimezone } = payload;

  // ------------------------------------------------------------------
  // Integrity check — server re-serializes and compares.
  // ------------------------------------------------------------------
  const expected = serializeGexLevels(levels);
  if (expected !== converted) {
    throw new HttpError(
      400,
      'Converted string does not match the levels array. ' +
        'The request may have been tampered with or corrupted.'
    );
  }

  const existing = await prisma.gexDay.findUnique({ where: { date } });

  // ------------------------------------------------------------------
  // Duplicate guard — client must explicitly opt in to overwriting.
  // ------------------------------------------------------------------
  if (existing && !overwrite) {
    const err = new HttpError(
      409,
      `GEX data for ${date} already exists. Confirm overwrite to replace it.`
    );
    // Attach existing metadata so the client can render a useful confirm.
    err.details = {
      existing: {
        date: existing.date,
        levelCount: existing.levelCount,
        blCount: existing.blCount,
        gexCount: existing.gexCount,
        uploadedAt: existing.updatedAt,
      },
    };
    throw err;
  }

  // ------------------------------------------------------------------
  // Denormalized counts — computed once, read many times.
  // ------------------------------------------------------------------
  const blCount = levels.filter((l) => l.type === 'BL').length;
  const gexCount = levels.filter((l) => l.type === 'GEX').length;
  const otherCount = levels.length - blCount - gexCount;

  const data = {
    date,
    levels,
    converted,
    levelCount: levels.length,
    blCount,
    gexCount,
    otherCount,
    sourceTimezone: sourceTimezone || GEX_DEFAULT_TIMEZONE,
    uploadedBy: actor.id,
  };

  const row = existing
    ? await prisma.gexDay.update({ where: { date }, data })
    : await prisma.gexDay.create({ data });

  // ------------------------------------------------------------------
  // Audit — distinguishes create vs overwrite so the log tells a story.
  // ------------------------------------------------------------------
  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: existing ? 'gex.overwrite' : 'gex.create',
    targetType: 'gex_day',
    targetId: date,
    metadata: {
      levelCount: levels.length,
      blCount,
      gexCount,
      otherCount,
      previousLevelCount: existing?.levelCount ?? null,
    },
    req: actor.req,
  });

  return serializeFull(row);
}

/* ------------------------------------------------------------------ */
/*  Delete                                                             */
/* ------------------------------------------------------------------ */

export async function deleteGexDay(actor, date) {
  const existing = await prisma.gexDay.findUnique({ where: { date } });
  if (!existing) throw new HttpError(404, `No GEX data for ${date}`);

  await prisma.gexDay.delete({ where: { date } });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'gex.delete',
    targetType: 'gex_day',
    targetId: date,
    metadata: {
      levelCount: existing.levelCount,
      blCount: existing.blCount,
      gexCount: existing.gexCount,
    },
    req: actor.req,
  });

  return { ok: true };
}