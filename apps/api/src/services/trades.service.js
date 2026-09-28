// apps/api/src/services/trades.service.js
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { generateTradeId } from '@mavrix/shared';
import { broadcastToUser } from '../lib/broadcaster.js';

const RESERVED = new Set([
  'date', 'entryTime', 'exitTime', 'direction', 'symbol',
  'mae', 'mfe', 'pnl', 'slPoints', 'contracts', 'notes',
]);

function splitTradePayload(payload) {
  const reserved = {};
  const dynamic = {};
  Object.entries(payload).forEach(([k, v]) => {
    if (RESERVED.has(k)) reserved[k] = v;
    else dynamic[k] = v === undefined || v === null ? '' : String(v);
  });
  return { reserved, dynamic };
}

function serialize(t) {
  return {
    id: t.id,
    accountId: t.accountId,
    tradeId: t.tradeId,
    date: t.date,
    entryTime: t.entryTime,
    exitTime: t.exitTime,
    direction: t.direction,
    symbol: t.symbol,
    mae: t.mae,
    mfe: t.mfe,
    pnl: t.pnl,
    slPoints: t.slPoints,
    contracts: t.contracts,
    notes: t.notes,
    ...(t.dynamic ?? {}),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

const notify = (userId, keys) =>
  broadcastToUser(userId, 'invalidate', { keys });

async function assertAccountOwnership(userId, accountId) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  });
  if (!account) throw new HttpError(404, 'Account not found');
}

async function assertTradeOwnership(userId, tradeId) {
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, account: { userId } },
  });
  if (!trade) throw new HttpError(404, 'Trade not found');
  return trade;
}

export async function listTrades(userId, accountId) {
  if (!accountId) throw new HttpError(400, 'accountId query param required');
  await assertAccountOwnership(userId, accountId);
  const trades = await prisma.trade.findMany({
    where: { accountId },
    orderBy: [{ date: 'desc' }, { entryTime: 'desc' }],
  });
  return trades.map(serialize);
}

export async function getTrade(userId, id) {
  const t = await assertTradeOwnership(userId, id);
  return serialize(t);
}

export async function createTrade(userId, payload) {
  const { accountId } = payload;
  if (!accountId) throw new HttpError(400, 'accountId is required');
  await assertAccountOwnership(userId, accountId);

  const { reserved, dynamic } = splitTradePayload(payload);
  const tradeId = generateTradeId(reserved);

  try {
    const t = await prisma.trade.create({
      data: { accountId, tradeId, ...reserved, dynamic },
    });
    notify(userId, [['trades', accountId]]);
    return serialize(t);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new HttpError(409, `Trade already exists (tradeId: ${tradeId})`);
    }
    throw err;
  }
}

export async function bulkCreateTrades(userId, { accountId, trades, columnConfigs }) {
  await assertAccountOwnership(userId, accountId);

  const prepared = trades.map((raw) => {
    const { reserved, dynamic } = splitTradePayload(raw);
    return {
      accountId,
      tradeId: generateTradeId(reserved),
      ...reserved,
      dynamic,
    };
  });

  const seen = new Set();
  for (const p of prepared) {
    if (seen.has(p.tradeId)) {
      throw new HttpError(409, `Duplicate tradeId in batch: ${p.tradeId}`);
    }
    seen.add(p.tradeId);
  }

  const existing = await prisma.trade.findMany({
    where: { accountId, tradeId: { in: prepared.map((p) => p.tradeId) } },
    select: { tradeId: true },
  });
  if (existing.length > 0) {
    throw new HttpError(409, `Trade already exists: ${existing[0].tradeId}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.trade.createMany({ data: prepared });
    if (columnConfigs) {
      await tx.account.update({
        where: { id: accountId },
        data: { columnConfigs },
      });
    }
  });

  // Trade list changed AND the account's columnConfigs may have changed.
  notify(userId, [['trades', accountId], ['accounts']]);
  return { created: prepared.length };
}

export async function updateTrade(userId, id, payload) {
  const existing = await assertTradeOwnership(userId, id);
  const { reserved, dynamic } = splitTradePayload(payload);

  const merged = {
    date: reserved.date ?? existing.date,
    entryTime: reserved.entryTime ?? existing.entryTime,
    exitTime: reserved.exitTime ?? existing.exitTime,
    direction: reserved.direction ?? existing.direction,
    symbol: reserved.symbol ?? existing.symbol,
  };
  const tradeId = generateTradeId(merged);

  const nextDynamic = { ...(existing.dynamic ?? {}), ...dynamic };

  try {
    const t = await prisma.trade.update({
      where: { id },
      data: { ...reserved, tradeId, dynamic: nextDynamic },
    });
    notify(userId, [['trades', existing.accountId]]);
    return serialize(t);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new HttpError(409, `Trade already exists (tradeId: ${tradeId})`);
    }
    throw err;
  }
}

export async function deleteTrade(userId, id) {
  const existing = await assertTradeOwnership(userId, id);
  const accountId = existing.accountId;
  await prisma.trade.delete({ where: { id } });
  notify(userId, [['trades', accountId]]);
  return { ok: true };
}

export async function deleteTradesByAccount(userId, accountId) {
  await assertAccountOwnership(userId, accountId);
  const res = await prisma.trade.deleteMany({ where: { accountId } });
  notify(userId, [['trades', accountId]]);
  return { deleted: res.count };
}

// ---------- Dynamic column operations ----------

export async function addCustomColumn(userId, accountId, columnName) {
  await assertAccountOwnership(userId, accountId);
  if (!columnName || !columnName.trim()) {
    throw new HttpError(400, 'columnName is required');
  }
  const trades = await prisma.trade.findMany({
    where: { accountId },
    select: { id: true, dynamic: true },
  });
  await prisma.$transaction(
    trades.map((t) =>
      prisma.trade.update({
        where: { id: t.id },
        data: { dynamic: { ...(t.dynamic ?? {}), [columnName]: '' } },
      })
    )
  );
  notify(userId, [['trades', accountId]]);
  return { updated: trades.length };
}

export async function deleteCustomColumn(userId, accountId, columnName) {
  await assertAccountOwnership(userId, accountId);
  const trades = await prisma.trade.findMany({
    where: { accountId },
    select: { id: true, dynamic: true },
  });
  await prisma.$transaction(
    trades.map((t) => {
      const next = { ...(t.dynamic ?? {}) };
      delete next[columnName];
      return prisma.trade.update({
        where: { id: t.id },
        data: { dynamic: next },
      });
    })
  );
  notify(userId, [['trades', accountId]]);
  return { updated: trades.length };
}

export async function renameCustomColumn(userId, accountId, oldName, newName) {
  await assertAccountOwnership(userId, accountId);
  if (!newName || !newName.trim()) {
    throw new HttpError(400, 'newName is required');
  }
  const trades = await prisma.trade.findMany({
    where: { accountId },
    select: { id: true, dynamic: true },
  });
  await prisma.$transaction(
    trades.map((t) => {
      const next = { ...(t.dynamic ?? {}) };
      if (oldName in next) {
        next[newName] = next[oldName];
        delete next[oldName];
      }
      return prisma.trade.update({
        where: { id: t.id },
        data: { dynamic: next },
      });
    })
  );
  notify(userId, [['trades', accountId]]);
  return { updated: trades.length };
}