import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';

const serialize = (a) => ({
  id: a.id,
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
  columnConfigs: a.columnConfigs ?? {},
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
});

export async function listAccounts(userId) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return accounts.map(serialize);
}

export async function getAccount(userId, accountId) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) throw new HttpError(404, 'Account not found');
  return serialize(account);
}

export async function createAccount(userId, data) {
  const account = await prisma.account.create({ data: { userId, ...data } });
  return serialize(account);
}

export async function updateAccount(userId, accountId, data) {
  const existing = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!existing) throw new HttpError(404, 'Account not found');
  const account = await prisma.account.update({ where: { id: accountId }, data });
  return serialize(account);
}

export async function updateColumnConfigs(userId, accountId, columnConfigs) {
  const existing = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!existing) throw new HttpError(404, 'Account not found');
  const account = await prisma.account.update({
    where: { id: accountId },
    data: { columnConfigs: columnConfigs ?? {} },
  });
  return serialize(account);
}

export async function deleteAccount(userId, accountId) {
  const existing = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!existing) throw new HttpError(404, 'Account not found');
  await prisma.account.delete({ where: { id: accountId } });
  return { ok: true };
}
