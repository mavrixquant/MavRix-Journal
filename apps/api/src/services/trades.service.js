
// apps/api/src/services/trades.service.js
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { generateTradeId, normalizeColumnConfigs } from '@mavrix/shared';
import { broadcastToUser } from '../lib/broadcaster.js';

// Every column that lives in a dedicated Trade column — NOT in `dynamic`.
// A single source of truth for both `splitTradePayload` and `sanitizeDynamic`.
const RESERVED = new Set([
  'date',
  'entryTime',
  'exitTime',
  'direction',
  'symbol',

  // Backtester-only
  'mae',
  'mfe',
  'slPoints',

  // Journal-only
  'entryPrice',
  'takeProfit',
  'stopLoss',

  // Common
  'pnl',
  'quantity',
  'notes',
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

// Strip any reserved keys that leaked into a dynamic JSON blob
// (e.g. from historical data written before the frontend excluded `notes`).
// Returns a fresh object — never mutates its input.
function sanitizeDynamic(dynamic) {
  if (!dynamic || typeof dynamic !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(dynamic)) {
    if (RESERVED.has(k)) continue;
    out[k] = v;
  }
  return out;
}

function serialize(t) {
  const dyn = sanitizeDynamic(t.dynamic);

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
    slPoints: t.slPoints,
    entryPrice: t.entryPrice,
    takeProfit: t.takeProfit,
    stopLoss: t.stopLoss,
    pnl: t.pnl,
    quantity: t.quantity,
    notes: t.notes,
    ...dyn,
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

  const baseDynamic = sanitizeDynamic(existing.dynamic);
  const nextDynamic = { ...baseDynamic, ...dynamic };

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
  if (RESERVED.has(columnName)) {
    throw new HttpError(400, `"${columnName}" is a reserved column name`);
  }
  const trades = await prisma.trade.findMany({
    where: { accountId },
    select: { id: true, dynamic: true },
  });
  await prisma.$transaction(
    trades.map((t) =>
      prisma.trade.update({
        where: { id: t.id },
        data: {
          dynamic: { ...sanitizeDynamic(t.dynamic), [columnName]: '' },
        },
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
      const next = { ...sanitizeDynamic(t.dynamic) };
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
  if (RESERVED.has(newName)) {
    throw new HttpError(400, `"${newName}" is a reserved column name`);
  }
  const trades = await prisma.trade.findMany({
    where: { accountId },
    select: { id: true, dynamic: true },
  });
  await prisma.$transaction(
    trades.map((t) => {
      const next = { ...sanitizeDynamic(t.dynamic) };
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

// ---------- Value-level operations on a custom column ----------
//
// These mutate the *content* of a single dynamic column across every trade
// in the account. They also keep `columnConfigs[columnName].options` in
// sync when the column is a dropdown.

/**
 * Rename every occurrence of `oldValue` → `newValue` in `dynamic[columnName]`.
 *
 * If the column is a dropdown and `oldValue` was listed in its options, the
 * options list is rewritten in the same transaction (with dedupe, in case
 * `newValue` was already an option — the frontend confirms merges before
 * calling this, but the backend stays idempotent).
 *
 * Returns { tradesUpdated, optionsUpdated }.
 */
export async function renameColumnValue(
  userId,
  accountId,
  columnName,
  { oldValue, newValue }
) {
  await assertAccountOwnership(userId, accountId);

  if (!columnName || !String(columnName).trim()) {
    throw new HttpError(400, 'columnName is required');
  }
  if (RESERVED.has(columnName)) {
    throw new HttpError(400, `"${columnName}" is a reserved column name`);
  }
  if (typeof oldValue !== 'string' || !oldValue.trim()) {
    throw new HttpError(400, 'oldValue is required and must be a non-empty string');
  }
  if (typeof newValue !== 'string' || !newValue.trim()) {
    throw new HttpError(400, 'newValue is required and must be a non-empty string');
  }
  if (oldValue === newValue) {
    return { tradesUpdated: 0, optionsUpdated: false };
  }

  // Fetch trades + account config in parallel — one round trip each.
  const [trades, account] = await Promise.all([
    prisma.trade.findMany({
      where: { accountId },
      select: { id: true, dynamic: true },
    }),
    prisma.account.findUnique({
      where: { id: accountId },
      select: { columnConfigs: true },
    }),
  ]);

  // Build the update batch. Only touch trades whose value matches exactly.
  const updates = [];
  for (const t of trades) {
    const dyn = sanitizeDynamic(t.dynamic);
    if (dyn[columnName] === oldValue) {
      dyn[columnName] = newValue;
      updates.push(
        prisma.trade.update({
          where: { id: t.id },
          data: { dynamic: dyn },
        })
      );
    }
  }

  // Keep dropdown options in sync.
  const configs = normalizeColumnConfigs(account?.columnConfigs || {});
  let optionsUpdated = false;
  const cfg = configs[columnName];
  if (cfg?.type === 'dropdown') {
    const opts = Array.isArray(cfg.options) ? cfg.options : [];
    if (opts.includes(oldValue)) {
      const nextOpts = opts.map((o) => (o === oldValue ? newValue : o));
      // De-dupe, preserving first-seen order.
      const seen = new Set();
      const deduped = [];
      for (const o of nextOpts) {
        if (!seen.has(o)) {
          seen.add(o);
          deduped.push(o);
        }
      }
      configs[columnName] = { type: 'dropdown', options: deduped };
      optionsUpdated = true;
    }
  }

  const ops = [...updates];
  if (optionsUpdated) {
    ops.push(
      prisma.account.update({
        where: { id: accountId },
        data: { columnConfigs: configs },
      })
    );
  }

  if (ops.length > 0) {
    // Neon can be slow on large batches — 30 s timeout.
    await prisma.$transaction(ops, { timeout: 30000 });
  }

  notify(userId, [['trades', accountId], ['accounts']]);
  return { tradesUpdated: updates.length, optionsUpdated };
}

/**
 * Clear every occurrence of `value` in `dynamic[columnName]` (sets to `''`).
 *
 * If the column is a dropdown and `value` was listed in its options, the
 * option is removed in the same transaction.
 *
 * Returns { tradesUpdated, optionsUpdated }.
 */
export async function clearColumnValue(
  userId,
  accountId,
  columnName,
  { value }
) {
  await assertAccountOwnership(userId, accountId);

  if (!columnName || !String(columnName).trim()) {
    throw new HttpError(400, 'columnName is required');
  }
  if (RESERVED.has(columnName)) {
    throw new HttpError(400, `"${columnName}" is a reserved column name`);
  }
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, 'value is required and must be a non-empty string');
  }

  const [trades, account] = await Promise.all([
    prisma.trade.findMany({
      where: { accountId },
      select: { id: true, dynamic: true },
    }),
    prisma.account.findUnique({
      where: { id: accountId },
      select: { columnConfigs: true },
    }),
  ]);

  const updates = [];
  for (const t of trades) {
    const dyn = sanitizeDynamic(t.dynamic);
    if (dyn[columnName] === value) {
      dyn[columnName] = '';
      updates.push(
        prisma.trade.update({
          where: { id: t.id },
          data: { dynamic: dyn },
        })
      );
    }
  }

  const configs = normalizeColumnConfigs(account?.columnConfigs || {});
  let optionsUpdated = false;
  const cfg = configs[columnName];
  if (cfg?.type === 'dropdown') {
    const opts = Array.isArray(cfg.options) ? cfg.options : [];
    if (opts.includes(value)) {
      configs[columnName] = {
        type: 'dropdown',
        options: opts.filter((o) => o !== value),
      };
      optionsUpdated = true;
    }
  }

  const ops = [...updates];
  if (optionsUpdated) {
    ops.push(
      prisma.account.update({
        where: { id: accountId },
        data: { columnConfigs: configs },
      })
    );
  }

  if (ops.length > 0) {
    await prisma.$transaction(ops, { timeout: 30000 });
  }

  notify(userId, [['trades', accountId], ['accounts']]);
  return { tradesUpdated: updates.length, optionsUpdated };
}