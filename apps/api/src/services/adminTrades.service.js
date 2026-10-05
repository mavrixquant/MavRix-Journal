// apps/api/src/services/adminTrades.service.js
//
// Cross-user trade administration. Reads + deletes only — we don't edit
// trades from the admin panel (edit flows are the user's job).

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../lib/audit.js';
import { broadcastToUser } from '../lib/broadcaster.js';

const serialize = (t) => ({
  id: t.id,
  accountId: t.accountId,
  tradeId: t.tradeId,
  date: t.date,
  entryTime: t.entryTime,
  exitTime: t.exitTime,
  direction: t.direction,
  symbol: t.symbol,
  pnl: t.pnl,
  quantity: t.quantity,
  notes: t.notes,
  createdAt: t.createdAt,
  account: t.account ? {
    id: t.account.id,
    name: t.account.name,
    type: t.account.type,
    user: t.account.user ? {
      id: t.account.user.id,
      email: t.account.user.email,
    } : undefined,
  } : undefined,
});

/* ------------------------------------------------------------------ */
/*  List — filter by account, user, date range, symbol                 */
/* ------------------------------------------------------------------ */
export async function listTrades({
  accountId,
  userId,
  from,
  to,
  symbol,
  q,
  page = 1,
  limit = 50,
} = {}) {
  const take = Math.min(Math.max(1, Number(limit)), 200);
  const skip = (Math.max(1, Number(page)) - 1) * take;

  const where = {};
  if (accountId) where.accountId = accountId;
  if (userId) where.account = { userId };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = String(from);
    if (to) where.date.lte = String(to);
  }
  if (symbol) where.symbol = { equals: String(symbol), mode: 'insensitive' };
  if (q) {
    where.OR = [
      { symbol: { contains: String(q), mode: 'insensitive' } },
      { notes: { contains: String(q), mode: 'insensitive' } },
      { tradeId: { contains: String(q), mode: 'insensitive' } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      orderBy: [{ date: 'desc' }, { entryTime: 'desc' }],
      skip,
      take,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            user: { select: { id: true, email: true } },
          },
        },
      },
    }),
    prisma.trade.count({ where }),
  ]);

  return {
    trades: rows.map(serialize),
    total,
    page: Math.max(1, Number(page)),
    limit: take,
    pages: Math.ceil(total / take),
  };
}

/* ------------------------------------------------------------------ */
/*  Delete single trade                                                */
/* ------------------------------------------------------------------ */
export async function deleteTrade(actor, tradeId) {
  const t = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: { account: { select: { id: true, userId: true } } },
  });
  if (!t) throw new HttpError(404, 'Trade not found');

  await prisma.trade.delete({ where: { id: tradeId } });

  broadcastToUser(t.account.userId, 'invalidate', {
    keys: [['trades', t.accountId]],
  });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'trade.delete',
    targetType: 'trade',
    targetId: tradeId,
    metadata: {
      accountId: t.accountId,
      ownerId: t.account.userId,
      tradeId: t.tradeId,
    },
    req: actor.req,
  });

  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Bulk delete by account                                             */
/* ------------------------------------------------------------------ */
export async function deleteTradesByAccount(actor, accountId) {
  const acc = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, userId: true },
  });
  if (!acc) throw new HttpError(404, 'Account not found');

  const res = await prisma.trade.deleteMany({ where: { accountId } });

  broadcastToUser(acc.userId, 'invalidate', { keys: [['trades', accountId]] });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'trade.bulk-delete',
    targetType: 'account',
    targetId: accountId,
    metadata: { deleted: res.count, ownerId: acc.userId },
    req: actor.req,
  });

  return { ok: true, deleted: res.count };
}