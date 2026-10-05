// apps/api/src/services/adminAccounts.service.js
//
// Cross-user account administration. Every mutation writes an audit row.

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../lib/audit.js';
import { broadcastToUser } from '../lib/broadcaster.js';

const serialize = (a) => ({
  id: a.id,
  userId: a.userId,
  name: a.name,
  balance: a.balance,
  currency: a.currency,
  type: a.type,
  riskType: a.riskType,
  riskValue: a.riskValue,
  riskUnit: a.riskUnit,
  slValue: a.slValue,
  slUnit: a.slUnit,
  commissionMode: a.commissionMode,
  commissionValue: a.commissionValue,
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
  user: a.user ? {
    id: a.user.id,
    email: a.user.email,
    firstName: a.user.firstName,
    lastName: a.user.lastName,
    role: a.user.role,
  } : undefined,
  _count: a._count || undefined,
});

/* ------------------------------------------------------------------ */
/*  List                                                                */
/* ------------------------------------------------------------------ */
export async function listAccounts({
  q = '',
  userId,
  type,
  page = 1,
  limit = 25,
} = {}) {
  const take = Math.min(Math.max(1, Number(limit)), 100);
  const skip = (Math.max(1, Number(page)) - 1) * take;

  const where = {};
  if (q) where.name = { contains: q, mode: 'insensitive' };
  if (userId) where.userId = userId;
  if (type) where.type = type;

  const [rows, total] = await Promise.all([
    prisma.account.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
        _count: { select: { trades: true } },
      },
    }),
    prisma.account.count({ where }),
  ]);

  return {
    accounts: rows.map(serialize),
    total,
    page: Math.max(1, Number(page)),
    limit: take,
    pages: Math.ceil(total / take),
  };
}

/* ------------------------------------------------------------------ */
/*  Detail                                                              */
/* ------------------------------------------------------------------ */
export async function getAccount(accountId) {
  const acc = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      },
      _count: { select: { trades: true } },
    },
  });
  if (!acc) throw new HttpError(404, 'Account not found');
  return serialize(acc);
}

/* ------------------------------------------------------------------ */
/*  Update                                                              */
/* ------------------------------------------------------------------ */
export async function updateAccount(actor, accountId, patch) {
  const existing = await prisma.account.findUnique({ where: { id: accountId } });
  if (!existing) throw new HttpError(404, 'Account not found');

  const data = {};
  const allowed = [
    'name', 'balance', 'currency', 'type',
    'riskType', 'riskValue', 'riskUnit',
    'slValue', 'slUnit',
    'commissionMode', 'commissionValue',
  ];

  for (const k of allowed) {
    if (patch[k] !== undefined) data[k] = patch[k];
  }

  if (Object.keys(data).length === 0) return getAccount(accountId);

  await prisma.account.update({ where: { id: accountId }, data });

  // Invalidate the owner's dashboard queries.
  broadcastToUser(existing.userId, 'invalidate', {
    keys: [['accounts'], ['trades', accountId]],
  });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'account.update',
    targetType: 'account',
    targetId: accountId,
    metadata: { patch, ownerId: existing.userId },
    req: actor.req,
  });

  return getAccount(accountId);
}

/* ------------------------------------------------------------------ */
/*  Reassign — change ownership (superadmin only, enforced in route)   */
/* ------------------------------------------------------------------ */
export async function reassignAccount(actor, accountId, newUserId) {
  if (!newUserId) throw new HttpError(400, 'newUserId is required');

  const acc = await prisma.account.findUnique({ where: { id: accountId } });
  if (!acc) throw new HttpError(404, 'Account not found');

  const target = await prisma.user.findUnique({ where: { id: newUserId } });
  if (!target) throw new HttpError(404, 'Target user not found');

  if (acc.userId === newUserId) return getAccount(accountId); // idempotent

  await prisma.account.update({
    where: { id: accountId },
    data: { userId: newUserId },
  });

  // Both users' dashboards need to refresh.
  broadcastToUser(acc.userId, 'invalidate', { keys: [['accounts'], ['trades', accountId]] });
  broadcastToUser(newUserId, 'invalidate', { keys: [['accounts'], ['trades', accountId]] });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'account.reassign',
    targetType: 'account',
    targetId: accountId,
    metadata: { fromUserId: acc.userId, toUserId: newUserId },
    req: actor.req,
  });

  return getAccount(accountId);
}

/* ------------------------------------------------------------------ */
/*  Delete (superadmin only, enforced in route)                        */
/*                                                                      */
/*  Cascades to the account's trades (FK onDelete: Cascade).            */
/* ------------------------------------------------------------------ */
export async function deleteAccount(actor, accountId) {
  const acc = await prisma.account.findUnique({
    where: { id: accountId },
    include: { _count: { select: { trades: true } } },
  });
  if (!acc) throw new HttpError(404, 'Account not found');

  const tradesCount = acc._count.trades;

  await prisma.account.delete({ where: { id: accountId } });

  broadcastToUser(acc.userId, 'invalidate', {
    keys: [['accounts'], ['trades', accountId]],
  });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'account.delete',
    targetType: 'account',
    targetId: accountId,
    metadata: {
      ownerId: acc.userId,
      accountName: acc.name,
      cascadedTrades: tradesCount,
    },
    req: actor.req,
  });

  return { ok: true, cascadedTrades: tradesCount };
}