import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../lib/audit.js';
import {
  serializeGexLevels,
  GEX_DEFAULT_TIMEZONE,
  GEX_SYMBOLS,
  DEFAULT_GEX_SYMBOL,
} from '@mavrix/shared';

function resolveSymbol(symbol) {
  const s = String(symbol || '').trim().toUpperCase();
  if (GEX_SYMBOLS.includes(s)) return s;
  return DEFAULT_GEX_SYMBOL;
}

const serializeListItem = (row) => ({
  date: row.date,
  symbol: row.symbol,
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
  symbol: row.symbol,
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


export async function listAdminGexDays(symbol) {
  const s = resolveSymbol(symbol);
  const rows = await prisma.gexDay.findMany({
    where: { symbol: s },
    orderBy: { date: 'desc' },
  });
  return rows.map(serializeListItem);
}


export async function upsertGexDay(actor, payload, { overwrite = false } = {}) {
  const { date, levels, converted, sourceTimezone, symbol: rawSymbol } = payload;
  const symbol = resolveSymbol(rawSymbol);

  const expected = serializeGexLevels(levels);
  if (expected !== converted) {
    throw new HttpError(
      400,
      'Converted string does not match the levels array. ' +
        'The request may have been tampered with or corrupted.'
    );
  }

  const existing = await prisma.gexDay.findUnique({
    where: { date_symbol: { date, symbol } },
  });

  if (existing && !overwrite) {
    const err = new HttpError(
      409,
      `GEX data for ${symbol} · ${date} already exists. Confirm overwrite to replace it.`
    );
    err.details = {
      existing: {
        date: existing.date,
        symbol: existing.symbol,
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
    symbol,
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
    ? await prisma.gexDay.update({
        where: { date_symbol: { date, symbol } },
        data,
      })
    : await prisma.gexDay.create({ data });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: existing ? 'gex.overwrite' : 'gex.create',
    targetType: 'gex_day',
    targetId: `${symbol}:${date}`,
    metadata: {
      symbol,
      date,
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


export async function deleteGexDay(actor, date, symbol) {
  const s = resolveSymbol(symbol);
  const existing = await prisma.gexDay.findUnique({
    where: { date_symbol: { date, symbol: s } },
  });
  if (!existing) throw new HttpError(404, `No GEX data for ${s} · ${date}`);

  await prisma.gexDay.delete({
    where: { date_symbol: { date, symbol: s } },
  });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'gex.delete',
    targetType: 'gex_day',
    targetId: `${s}:${date}`,
    metadata: {
      symbol: s,
      date,
      levelCount: existing.levelCount,
      blCount: existing.blCount,
      gexCount: existing.gexCount,
    },
    req: actor.req,
  });

  return { ok: true };
}