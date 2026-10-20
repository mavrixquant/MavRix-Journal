
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';


const serializeListItem = (row) => ({
  date: row.date,
  levelCount: row.levelCount,
  blCount: row.blCount,
  gexCount: row.gexCount,
  otherCount: row.otherCount,
  uploadedAt: row.updatedAt,
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
  createdAt: row.createdAt,
  uploadedAt: row.updatedAt,
});


export async function listGexDays() {
  const rows = await prisma.gexDay.findMany({
    orderBy: { date: 'desc' },
  });
  return rows.map(serializeListItem);
}

export async function getGexDay(date) {
  const row = await prisma.gexDay.findUnique({ where: { date } });
  if (!row) throw new HttpError(404, `No GEX data for ${date}`);
  return serializeFull(row);
}