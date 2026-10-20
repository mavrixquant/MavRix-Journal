
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../lib/audit.js';
import {
  serializeGexLevels,
  GEX_DEFAULT_TIMEZONE,
} from '@mavrix/shared';


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


export async function listAdminGexDays() {
  const rows = await prisma.gexDay.findMany({
    orderBy: { date: 'desc' },
  });
  return rows.map(serializeListItem);
}


export async function upsertGexDay(actor, payload, { overwrite = false } = {}) {
  const { date, levels, converted, sourceTimezone } = payload;

  const expected = serializeGexLevels(levels);
  if (expected !== converted) {
    throw new HttpError(
      400,
      'Converted string does not match the levels array. ' +
        'The request may have been tampered with or corrupted.'
    );
  }

  const existing = await prisma.gexDay.findUnique({ where: { date } });

  if (existing && !overwrite) {
    const err = new HttpError(
      409,
      `GEX data for ${date} already exists. Confirm overwrite to replace it.`
    );
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