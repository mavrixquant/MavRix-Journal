import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { GEX_SYMBOLS, DEFAULT_GEX_SYMBOL } from '@mavrix/shared';

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
  uploadedAt: row.updatedAt,
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
  createdAt: row.createdAt,
  uploadedAt: row.updatedAt,
});


export async function listGexDays(symbol) {
  const s = resolveSymbol(symbol);
  const rows = await prisma.gexDay.findMany({
    where: { symbol: s },
    orderBy: { date: 'desc' },
  });
  return rows.map(serializeListItem);
}

export async function getGexDay(date, symbol) {
  const s = resolveSymbol(symbol);
  const row = await prisma.gexDay.findUnique({
    where: { date_symbol: { date, symbol: s } },
  });
  if (!row) throw new HttpError(404, `No GEX data for ${s} · ${date}`);
  return serializeFull(row);
}