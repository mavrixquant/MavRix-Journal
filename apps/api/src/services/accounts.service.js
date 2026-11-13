import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { broadcastToUser } from '../lib/broadcaster.js';

const RESERVED_TRADE_FIELDS = new Set([
  'id', 'accountId', 'tradeId', 'strategyId',
  'date', 'entryTime', 'exitTime', 'direction', 'symbol',
  'mae', 'mfe', 'slPoints',
  'entryPrice', 'exitPrice', 'takeProfit', 'stopLoss',
  'pnl', 'quantity', 'commission', 'notes',
  'dynamic', 'strategy', 'createdAt', 'updatedAt',
]);

const stripReservedColumnNames = (configs) => {
  if (!configs || typeof configs !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(configs)) {
    if (!RESERVED_TRADE_FIELDS.has(k)) out[k] = v;
  }
  return out;
};

const serialize = (a) => ({
  id: a.id,
  name: a.name,
  balance: a.balance,
  currency: a.currency,
  type: a.type,
  columnConfigs: a.columnConfigs ?? {},
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
});

const notify = (userId, keys) =>
  broadcastToUser(userId, 'invalidate', { keys });

export async function listAccounts(userId) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return accounts.map(serialize);
}

export async function getAccount(userId, accountId) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) throw new HttpError(404, 'Account not found');
  return serialize(account);
}

export async function createAccount(userId, data) {
  const payload = { ...data };
  if (payload.columnConfigs) {
    payload.columnConfigs = stripReservedColumnNames(payload.columnConfigs);
  }
  const account = await prisma.account.create({ data: { userId, ...payload } });
  notify(userId, [['accounts']]);
  return serialize(account);
}

export async function updateAccount(userId, accountId, data) {
  const existing = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!existing) throw new HttpError(404, 'Account not found');
  const payload = { ...data };
  if (payload.columnConfigs) {
    payload.columnConfigs = stripReservedColumnNames(payload.columnConfigs);
  }
  const account = await prisma.account.update({
    where: { id: accountId },
    data: payload,
  });
  notify(userId, [['accounts']]);
  return serialize(account);
}

export async function updateColumnConfigs(userId, accountId, columnConfigs) {
  const existing = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!existing) throw new HttpError(404, 'Account not found');
  const account = await prisma.account.update({
    where: { id: accountId },
    data: { columnConfigs: stripReservedColumnNames(columnConfigs) },
  });
  notify(userId, [['accounts']]);
  return serialize(account);
}

export async function deleteAccount(userId, accountId) {
  const existing = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!existing) throw new HttpError(404, 'Account not found');
  await prisma.account.delete({ where: { id: accountId } });
  notify(userId, [['accounts'], ['trades', accountId]]);
  return { ok: true };
}