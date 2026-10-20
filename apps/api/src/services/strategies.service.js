
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { broadcastToUser } from '../lib/broadcaster.js';

const notify = (userId) =>
  broadcastToUser(userId, 'invalidate', {
    keys: [['strategies'], ['trades']],
  });

const serialize = (s) => ({
  id: s.id,
  name: s.name,
  description: s.description,
  rules: s.rules,
  status: s.status,
  color: s.color,
  direction: s.direction,
  timeframe: s.timeframe,
  tags: s.tags,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
  tradeCount: s._count?.trades ?? 0,
});


export async function listStrategies(userId, { status } = {}) {
  const where = { userId };
  if (status) where.status = status;

  const rows = await prisma.strategy.findMany({
    where,
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { trades: true } } },
  });

  return rows.map(serialize);
}

export async function getStrategy(userId, id) {
  const s = await prisma.strategy.findFirst({
    where: { id, userId },
    include: { _count: { select: { trades: true } } },
  });
  if (!s) throw new HttpError(404, 'Strategy not found');
  return serialize(s);
}


export async function createStrategy(userId, data) {
  try {
    const s = await prisma.strategy.create({
      data: {
        userId,
        name: data.name,
        description: data.description ?? '',
        rules: data.rules ?? '',
        status: data.status ?? 'active',
        color: data.color ?? '#F59E0B',
        direction: data.direction ?? null,
        timeframe: data.timeframe ?? null,
        tags: data.tags ?? [],
      },
      include: { _count: { select: { trades: true } } },
    });

    notify(userId);
    return serialize(s);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new HttpError(409, `A strategy named "${data.name}" already exists.`);
    }
    throw err;
  }
}

export async function updateStrategy(userId, id, patch) {
  const existing = await prisma.strategy.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new HttpError(404, 'Strategy not found');

  const data = {};
  const allowed = [
    'name', 'description', 'rules', 'status',
    'color', 'direction', 'timeframe', 'tags',
  ];
  for (const k of allowed) {
    if (patch[k] !== undefined) data[k] = patch[k];
  }

  if (Object.keys(data).length === 0) return getStrategy(userId, id);

  try {
    const s = await prisma.strategy.update({
      where: { id },
      data,
      include: { _count: { select: { trades: true } } },
    });
    notify(userId);
    return serialize(s);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new HttpError(409, `A strategy named "${data.name}" already exists.`);
    }
    throw err;
  }
}

export async function deleteStrategy(userId, id) {
  const existing = await prisma.strategy.findFirst({
    where: { id, userId },
    select: {
      id: true,
      name: true,
      _count: { select: { trades: true } },
    },
  });
  if (!existing) throw new HttpError(404, 'Strategy not found');

  await prisma.strategy.delete({ where: { id } });
  notify(userId);

  return { ok: true, detachedTrades: existing._count.trades };
}

export async function archiveStrategy(userId, id) {
  return updateStrategy(userId, id, { status: 'archived' });
}