import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { broadcastToUser } from '../lib/broadcaster.js';
import {
  computeStrategyStats,
  liteStats,
  buildInsights,
  computePlanCompliance,
} from '@mavrix/shared';

const notify = (userId) =>
  broadcastToUser(userId, 'invalidate', {
    keys: [['strategies'], ['trades']],
  });

const withCount = { _count: { select: { trades: true } } };

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
  playbook: s.playbook && typeof s.playbook === 'object' ? s.playbook : {},
  sessions: s.sessions ?? [],
  symbols: s.symbols ?? [],
  targetRR: s.targetRR ?? null,
  riskPerTrade: s.riskPerTrade ?? null,
  maxTradesPerDay: s.maxTradesPerDay ?? null,
  pinned: !!s.pinned,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
  tradeCount: s._count?.trades ?? 0,
});

const STATUS_RANK = { active: 0, paused: 1, archived: 2 };

const WRITABLE = [
  'name', 'description', 'rules', 'status', 'color', 'direction', 'timeframe', 'tags',
  'playbook', 'sessions', 'symbols', 'targetRR', 'riskPerTrade', 'maxTradesPerDay', 'pinned',
];

const dupMessage = (name) => `A strategy named "${name}" already exists.`;

/* ───────────────────────── CRUD ───────────────────────── */

export async function listStrategies(userId, { status } = {}) {
  const where = { userId };
  if (status) where.status = status;

  const rows = await prisma.strategy.findMany({ where, include: withCount });

  return rows
    .map(serialize)
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
        a.name.localeCompare(b.name),
    );
}

export async function getStrategy(userId, id) {
  const s = await prisma.strategy.findFirst({ where: { id, userId }, include: withCount });
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
        playbook: data.playbook ?? {},
        sessions: data.sessions ?? [],
        symbols: data.symbols ?? [],
        targetRR: data.targetRR ?? null,
        riskPerTrade: data.riskPerTrade ?? null,
        maxTradesPerDay: data.maxTradesPerDay ?? null,
        pinned: data.pinned ?? false,
      },
      include: withCount,
    });
    notify(userId);
    return serialize(s);
  } catch (err) {
    if (err.code === 'P2002') throw new HttpError(409, dupMessage(data.name));
    throw err;
  }
}

export async function updateStrategy(userId, id, patch) {
  const existing = await prisma.strategy.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Strategy not found');

  const data = {};
  for (const k of WRITABLE) if (patch[k] !== undefined) data[k] = patch[k];
  if (Object.keys(data).length === 0) return getStrategy(userId, id);

  try {
    const s = await prisma.strategy.update({ where: { id }, data, include: withCount });
    notify(userId);
    return serialize(s);
  } catch (err) {
    if (err.code === 'P2002') throw new HttpError(409, dupMessage(data.name));
    throw err;
  }
}

export async function deleteStrategy(userId, id) {
  const existing = await prisma.strategy.findFirst({
    where: { id, userId },
    select: { id: true, name: true, ...withCount },
  });
  if (!existing) throw new HttpError(404, 'Strategy not found');

  await prisma.strategy.delete({ where: { id } });
  notify(userId);
  return { ok: true, detachedTrades: existing._count.trades };
}

export async function archiveStrategy(userId, id) {
  return updateStrategy(userId, id, { status: 'archived', pinned: false });
}

// Copies the playbook (not the trades) under a unique "(copy)" name.
export async function duplicateStrategy(userId, id) {
  const src = await prisma.strategy.findFirst({ where: { id, userId } });
  if (!src) throw new HttpError(404, 'Strategy not found');

  const names = new Set(
    (await prisma.strategy.findMany({ where: { userId }, select: { name: true } })).map((r) => r.name),
  );
  const base = src.name.replace(/ \(copy( \d+)?\)$/, '').slice(0, 68);
  let name = `${base} (copy)`;
  for (let i = 2; names.has(name); i++) name = `${base} (copy ${i})`;

  return createStrategy(userId, {
    name,
    description: src.description,
    rules: src.rules,
    status: 'paused',
    color: src.color,
    direction: src.direction,
    timeframe: src.timeframe,
    tags: src.tags,
    playbook: src.playbook,
    sessions: src.sessions,
    symbols: src.symbols,
    targetRR: src.targetRR,
    riskPerTrade: src.riskPerTrade,
    maxTradesPerDay: src.maxTradesPerDay,
    pinned: false,
  });
}

/* ───────────────────────── Analytics ───────────────────────── */

function tradeWhere(userId, filters = {}) {
  const account = { userId };
  if (filters.accountType) account.type = filters.accountType;
  const where = { account };
  if (filters.accountId) where.accountId = filters.accountId;
  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = filters.from;
    if (filters.to) where.date.lte = filters.to;
  }
  return where;
}

const STAT_SELECT = {
  id: true,
  date: true,
  entryTime: true,
  exitTime: true,
  direction: true,
  symbol: true,
  pnl: true,
  commission: true,
};

// One query, grouped in memory: per-strategy summary + combined totals.
export async function getOverview(userId, filters = {}) {
  const rows = await prisma.trade.findMany({
    where: tradeWhere(userId, filters),
    select: { ...STAT_SELECT, strategyId: true },
  });

  const byStrategy = new Map();
  const tagged = [];
  let untagged = { n: 0, net: 0 };
  for (const t of rows) {
    if (!t.strategyId) {
      untagged = { n: untagged.n + 1, net: untagged.net + (t.pnl || 0) };
      continue;
    }
    tagged.push(t);
    if (!byStrategy.has(t.strategyId)) byStrategy.set(t.strategyId, []);
    byStrategy.get(t.strategyId).push(t);
  }

  const stats = {};
  for (const [sid, list] of byStrategy) stats[sid] = liteStats(computeStrategyStats(list));

  return {
    filters,
    stats, // { [strategyId]: lite }; strategies without trades are simply absent
    totals: liteStats(computeStrategyStats(tagged), 60),
    untagged: { n: untagged.n, net: Math.round(untagged.net * 100) / 100 },
  };
}

const TRADE_ROW_CAP = 5000;

export async function getPerformance(userId, id, filters = {}) {
  const strategy = await getStrategy(userId, id);

  const rows = await prisma.trade.findMany({
    where: { ...tradeWhere(userId, filters), strategyId: id },
    select: {
      ...STAT_SELECT,
      accountId: true,
      quantity: true,
      mae: true,
      mfe: true,
      notes: true,
      account: { select: { id: true, name: true, type: true } },
    },
    orderBy: [{ date: 'asc' }, { entryTime: 'asc' }],
    take: 20000,
  });

  const stats = computeStrategyStats(rows);

  const accounts = new Map();
  for (const t of rows) {
    const a = accounts.get(t.accountId) || { ...t.account, n: 0 };
    a.n += 1;
    accounts.set(t.accountId, a);
  }

  const trades = rows
    .slice(-TRADE_ROW_CAP)
    .reverse()
    .map((t) => ({
      id: t.id,
      date: t.date,
      entryTime: t.entryTime,
      exitTime: t.exitTime,
      direction: t.direction,
      symbol: t.symbol,
      pnl: t.pnl,
      quantity: t.quantity,
      commission: t.commission,
      mae: t.mae,
      mfe: t.mfe,
      notes: t.notes,
      accountId: t.accountId,
      accountName: t.account?.name ?? '',
      accountType: t.account?.type ?? '',
    }));

  return {
    strategy,
    filters,
    stats,
    insights: buildInsights(stats),
    compliance: computePlanCompliance(strategy, rows),
    accounts: [...accounts.values()],
    trades,
    truncated: rows.length > TRADE_ROW_CAP,
  };
}
