// apps/api/src/services/adminStrategies.service.js
//
// Cross-user strategy administration. Read + hard-delete only — no
// admin creation or editing on behalf of a user.

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../lib/audit.js';
import { broadcastToUser } from '../lib/broadcaster.js';

const serialize = (s) => ({
  id: s.id,
  userId: s.userId,
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
  user: s.user
    ? {
        id: s.user.id,
        email: s.user.email,
        firstName: s.user.firstName,
        lastName: s.user.lastName,
      }
    : undefined,
});

export async function listStrategies({
  q = '',
  userId,
  status,
  page = 1,
  limit = 25,
} = {}) {
  const take = Math.min(Math.max(1, Number(limit)), 100);
  const skip = (Math.max(1, Number(page)) - 1) * take;

  const where = {};
  if (q) where.name = { contains: q, mode: 'insensitive' };
  if (userId) where.userId = userId;
  if (status) where.status = status;

  const [rows, total] = await Promise.all([
    prisma.strategy.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        _count: { select: { trades: true } },
      },
    }),
    prisma.strategy.count({ where }),
  ]);

  return {
    strategies: rows.map(serialize),
    total,
    page: Math.max(1, Number(page)),
    limit: take,
    pages: Math.ceil(total / take),
  };
}

export async function getStrategy(id) {
  const s = await prisma.strategy.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      _count: { select: { trades: true } },
    },
  });
  if (!s) throw new HttpError(404, 'Strategy not found');
  return serialize(s);
}

/**
 * Hard delete. Detaches trades (FK SetNull). Audits with the owner id
 * and the number of trades that lost their tag, so an operator can see
 * the blast radius in the audit log after the fact.
 */
export async function deleteStrategy(actor, id) {
  const s = await prisma.strategy.findUnique({
    where: { id },
    include: { _count: { select: { trades: true } } },
  });
  if (!s) throw new HttpError(404, 'Strategy not found');

  await prisma.strategy.delete({ where: { id } });

  broadcastToUser(s.userId, 'invalidate', {
    keys: [['strategies'], ['trades']],
  });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'strategy.delete',
    targetType: 'strategy',
    targetId: id,
    metadata: {
      ownerId: s.userId,
      name: s.name,
      detachedTrades: s._count.trades,
    },
    req: actor.req,
  });

  return { ok: true, detachedTrades: s._count.trades };
}