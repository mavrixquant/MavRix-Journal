import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { broadcastToUser } from '../lib/broadcaster.js';
import {
  computeBacktestPnl,
  BACKTEST_INTERVAL_MAX_DAYS,
} from '@mavrix/shared';

/**
 * Server-side fill validation (A5): Re-simulate SL/TP fills against market data
 * to validate client-reported fills. This prevents manipulation of exit prices.
 *
 * Returns validated fill info or throws if validation fails.
 */
async function validateFillAgainstBars({
  symbol,
  side,
  stopLoss,
  takeProfit,
  exitTime,
  exitPrice,
  interval,
}) {
  if (!exitTime || !exitPrice) return null;

  // Fetch bars around the exit time to re-simulate the fill
  const exitDt = new Date(exitTime);
  const oneBarMs = getIntervalMs(interval);
  const from = new Date(exitDt.getTime() - oneBarMs * 2);
  const to = new Date(exitDt.getTime() + oneBarMs * 2);

  const bars = await prisma.marketBar.findMany({
    where: {
      symbol: symbol.toUpperCase(),
      interval,
      time: { gte: from, lte: to },
    },
    orderBy: { time: 'asc' },
    take: 10,
  });

  if (bars.length === 0) {
    // No market data available - log but don't block (allow manual override)
    console.warn(`[validateFill] No bars for ${symbol} ${interval} at ${exitTime}`);
    return { validated: false, reason: 'no_data', exitPrice };
  }

  // Find the bar where exit occurred (bar containing the exit time)
  const exitBar = bars.find((b) => b.time <= exitDt && b.time.getTime() + oneBarMs >= exitDt.getTime()) || bars[bars.length - 1];

  const long = side === 'long';
  const sl = Number(stopLoss) || null;
  const tp = Number(takeProfit) || null;

  // Determine expected fill based on SL/TP rules
  // SL check takes precedence: if both SL and TP would be hit in same bar, SL wins
  let expectedPrice = exitPrice;
  let expectedReason = null;

  const slHit = sl != null && (long ? exitBar.low <= sl : exitBar.high >= sl);
  const tpHit = tp != null && (long ? exitBar.high >= tp : exitBar.low <= tp);

  if (slHit) {
    // SL fills at open if gapped, else at SL price (same logic as checkFill)
    const gap = long ? exitBar.open < sl : exitBar.open > sl;
    expectedPrice = gap ? exitBar.open : sl;
    expectedReason = 'sl_validated';
  } else if (tpHit) {
    const gap = long ? exitBar.open > tp : exitBar.open < tp;
    expectedPrice = gap ? exitBar.open : tp;
    expectedReason = 'tp_validated';
  }

  // Validate: allow small slippage (tick size) on market orders
  const tick = getTickSize(symbol, interval);
  const deviation = Math.abs(exitPrice - expectedPrice);

  if (expectedReason === 'sl_validated' || expectedReason === 'tp_validated') {
    if (deviation > tick * 3) {
      // More than 3 ticks deviation - reject or warn
      console.warn(
        `[validateFill] ${symbol} exit price ${exitPrice} deviates ${deviation} from expected ${expectedPrice} (${expectedReason})`
      );
      return {
        validated: false,
        reason: 'price_deviation',
        expectedPrice,
        actualPrice: exitPrice,
        deviation,
      };
    }
    return {
      validated: true,
      reason: expectedReason,
      exitPrice: expectedPrice,
    };
  }

  return { validated: true, reason: 'manual', exitPrice };
}

function getIntervalMs(interval) {
  const map = { '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000 };
  return map[interval] || 300_000;
}

function getTickSize(symbol, interval) {
  // Conservative tick sizes for futures
  const tickMap = {
    '1m': 0.01, '5m': 0.01, '15m': 0.01, '1h': 0.1, '4h': 0.5, '1d': 1,
  };
  // Use higher precision for finer intervals
  return tickMap[interval] || 0.01;
}

const notify = (userId) =>
  broadcastToUser(userId, 'invalidate', { keys: [['backtest-sessions']] });

/* ───────────────────────────── serializers ───────────────────────────── */

const serializeTrade = (t) => ({
  id: t.id,
  sessionId: t.sessionId,
  tradeId: t.tradeId,
  symbol: t.symbol,
  side: t.side,
  entryTime: t.entryTime,
  entryPrice: t.entryPrice,
  exitTime: t.exitTime,
  exitPrice: t.exitPrice,
  quantity: t.quantity,
  pnl: t.pnl,
  slPoints: t.slPoints,
  stopLoss: t.stopLoss,
  takeProfit: t.takeProfit,
  commission: t.commission,
  exitReason: t.exitReason,
  orderType: t.orderType,
  orderPrice: t.orderPrice,
  filledAt: t.filledAt,
  strategyId: t.strategyId,
  strategy: t.strategy
    ? { id: t.strategy.id, name: t.strategy.name, color: t.strategy.color }
    : null,
  notes: t.notes,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
  idempotencyKey: t.idempotencyKey ?? undefined,
});

const EMPTY_AGG = { tradesCount: 0, openCount: 0, pendingCount: 0, netPnl: 0 };

const serializeSession = (s, agg = EMPTY_AGG) => ({
  id: s.id,
  name: s.name,
  type: s.type,
  currency: s.currency,
  startingBalance: s.startingBalance,
  fromDate: s.fromDate,
  toDate: s.toDate,
  instruments: s.instruments,
  interval: s.interval,
  status: s.status,
  propFirmConfig: s.propFirmConfig && typeof s.propFirmConfig === 'object' ? s.propFirmConfig : null,
  replayTime: s.replayTime,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
  // Always derived from the trade rows — never stored, so they cannot drift.
  tradesCount: agg.tradesCount,
  openCount: agg.openCount,
  pendingCount: agg.pendingCount,
  netPnl: agg.netPnl,
  currentBalance: +(s.startingBalance + agg.netPnl).toFixed(2),
});

// A row is a PENDING ORDER when it is a limit/stop order that has not been filled yet.
const PENDING = { orderType: { not: 'market' }, filledAt: null };

/** Aggregates for many sessions in a few grouped queries. */
async function aggregateFor(sessionIds) {
  const map = new Map();
  if (sessionIds.length === 0) return map;

  const [all, open, pending] = await Promise.all([
    prisma.backtestTrade.groupBy({
      by: ['sessionId'],
      where: { sessionId: { in: sessionIds } },
      _count: { _all: true },
      _sum: { pnl: true, commission: true },
    }),
    prisma.backtestTrade.groupBy({
      by: ['sessionId'],
      where: { sessionId: { in: sessionIds }, exitTime: null, NOT: PENDING },
      _count: { _all: true },
    }),
    prisma.backtestTrade.groupBy({
      by: ['sessionId'],
      where: { sessionId: { in: sessionIds }, exitTime: null, ...PENDING },
      _count: { _all: true },
    }),
  ]);

  for (const g of all) {
    map.set(g.sessionId, {
      tradesCount: g._count._all,
      openCount: 0,
      pendingCount: 0,
      netPnl: +((g._sum.pnl || 0) - (g._sum.commission || 0)).toFixed(2),
    });
  }
  for (const g of open) {
    const cur = map.get(g.sessionId);
    if (cur) cur.openCount = g._count._all;
  }
  for (const g of pending) {
    const cur = map.get(g.sessionId);
    if (cur) cur.pendingCount = g._count._all;
  }
  return map;
}

/* ───────────────────────────── ownership ───────────────────────────── */

async function requireSession(userId, id) {
  const s = await prisma.backtestSession.findFirst({ where: { id, userId } });
  if (!s) throw new HttpError(404, 'Session not found');
  return s;
}

async function requireStrategy(userId, strategyId) {
  if (!strategyId) return;
  const s = await prisma.strategy.findFirst({
    where: { id: strategyId, userId },
    select: { id: true },
  });
  if (!s) throw new HttpError(404, 'Strategy not found');
}

const dupName = (name) => `A session named "${name}" already exists.`;

/* ──────────────────────────── data availability ──────────────────────────── */

const dayOf = (d) => new Date(d).toISOString().slice(0, 10);

/**
 * What the replay can actually run on: the contiguous window stored per (symbol, interval)
 * in market_bar_coverage. Dates are returned as UTC YYYY-MM-DD.
 */
export async function getAvailability() {
  const rows = await prisma.marketBarCoverage.findMany({
    select: { symbol: true, interval: true, fromTime: true, toTime: true },
    orderBy: [{ symbol: 'asc' }, { interval: 'asc' }],
  });
  return rows
    .filter((r) => r.fromTime && r.toTime && r.toTime > r.fromTime)
    .map((r) => ({ symbol: r.symbol, interval: r.interval, from: dayOf(r.fromTime), to: dayOf(r.toTime) }));
}

async function assertDataAvailable({ instruments, interval, fromDate, toDate }) {
  const rows = await prisma.marketBarCoverage.findMany({
    where: { symbol: { in: instruments }, interval },
    select: { symbol: true, fromTime: true, toTime: true },
  });
  const bySym = new Map(rows.map((r) => [r.symbol, r]));
  for (const sym of instruments) {
    const c = bySym.get(sym);
    if (!c || !c.fromTime || !c.toTime) {
      throw new HttpError(400, `No ${interval} data is available for ${sym}.`);
    }
    if (fromDate < dayOf(c.fromTime) || toDate > dayOf(c.toTime)) {
      throw new HttpError(
        400,
        `${sym} ${interval} data is only available from ${dayOf(c.fromTime)} to ${dayOf(c.toTime)}.`,
      );
    }
  }
}

/* ───────────────────────────── sessions ───────────────────────────── */

export async function listSessions(userId, { status } = {}) {
  const where = { userId };
  if (status) where.status = status;
  const rows = await prisma.backtestSession.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  });
  const agg = await aggregateFor(rows.map((r) => r.id));
  return rows.map((r) => serializeSession(r, agg.get(r.id)));
}

export async function getSession(userId, id) {
  const s = await requireSession(userId, id);
  const agg = await aggregateFor([s.id]);
  return serializeSession(s, agg.get(s.id));
}

export async function createSession(userId, data) {
  await assertDataAvailable(data);
  try {
    const s = await prisma.backtestSession.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        currency: data.currency.toUpperCase(),
        startingBalance: data.startingBalance,
        fromDate: data.fromDate,
        toDate: data.toDate,
        instruments: data.instruments,
        interval: data.interval,
        propFirmConfig: data.type === 'prop' ? data.propFirmConfig : undefined,
        replayTime: null,
      },
    });
    notify(userId);
    return serializeSession(s);
  } catch (err) {
    if (err.code === 'P2002') throw new HttpError(409, dupName(data.name));
    throw err;
  }
}

const LOCKED_WHEN_TRADES = [
  'type', 'currency', 'startingBalance', 'fromDate', 'toDate', 'instruments', 'interval', 'propFirmConfig',
];

export async function updateSession(userId, id, patch) {
  const existing = await requireSession(userId, id);

  const data = {};
  for (const k of ['name', 'status', 'replayTime', ...LOCKED_WHEN_TRADES]) {
    if (patch[k] !== undefined) data[k] = patch[k];
  }
  if (data.replayTime) data.replayTime = new Date(data.replayTime);
  if (data.currency) data.currency = data.currency.toUpperCase();
  if (Object.keys(data).length === 0) return getSession(userId, id);

  const touchesLocked = LOCKED_WHEN_TRADES.some((k) => data[k] !== undefined);
  if (touchesLocked) {
    const count = await prisma.backtestTrade.count({ where: { sessionId: id } });
    if (count > 0) {
      throw new HttpError(409, 'Setup can’t be changed once a session has trades.');
    }
    const merged = { ...existing, ...data };
    if (merged.fromDate > merged.toDate) throw new HttpError(400, 'End date must be after the start date');
    const max = BACKTEST_INTERVAL_MAX_DAYS[merged.interval];
    const days =
      Math.round(
        (Date.parse(`${merged.toDate}T00:00:00Z`) - Date.parse(`${merged.fromDate}T00:00:00Z`)) / 86400000,
      ) + 1;
    if (max && days > max) throw new HttpError(400, `${merged.interval} sessions can cover at most ${max} days`);
    if (merged.type === 'prop' && !merged.propFirmConfig) throw new HttpError(400, 'Prop firm rules are required');
    if (merged.type === 'standard') data.propFirmConfig = null;
  }

  try {
    const s = await prisma.backtestSession.update({ where: { id }, data });
    notify(userId);
    const agg = await aggregateFor([s.id]);
    return serializeSession(s, agg.get(s.id));
  } catch (err) {
    if (err.code === 'P2002') throw new HttpError(409, dupName(data.name));
    throw err;
  }
}

export async function deleteSession(userId, id) {
  await requireSession(userId, id);
  const { count } = await prisma.backtestTrade.deleteMany({ where: { sessionId: id } });
  await prisma.backtestSession.delete({ where: { id } });
  notify(userId);
  return { ok: true, deletedTrades: count };
}

/* ───────────────────────────── trades ───────────────────────────── */

export async function listTrades(userId, sessionId) {
  await requireSession(userId, sessionId);
  const rows = await prisma.backtestTrade.findMany({
    where: { sessionId },
    orderBy: [{ entryTime: 'asc' }, { createdAt: 'asc' }],
    include: { strategy: true },
  });
  return rows.map(serializeTrade);
}

function assertWritable(session) {
  if (session.status !== 'active') {
    throw new HttpError(409, `This session is ${session.status}. Reopen it to change trades.`);
  }
}

const slPointsFrom = (entry, stop) =>
  stop != null && Number.isFinite(stop) ? +Math.abs(entry - stop).toFixed(6) : null;

function assertBrackets({ side, entryPrice, stopLoss, takeProfit }) {
  const long = side === 'long';
  if (stopLoss != null && (long ? stopLoss >= entryPrice : stopLoss <= entryPrice)) {
    throw new HttpError(400, `Stop loss must be ${long ? 'below' : 'above'} the entry price`);
  }
  if (takeProfit != null && (long ? takeProfit <= entryPrice : takeProfit >= entryPrice)) {
    throw new HttpError(400, `Take profit must be ${long ? 'above' : 'below'} the entry price`);
  }
}

export async function createTrade(userId, sessionId, data) {
  const session = await requireSession(userId, sessionId);
  assertWritable(session);

  if (!session.instruments.includes(data.symbol)) {
    throw new HttpError(400, `${data.symbol} is not part of this session`);
  }
  const cfg = session.propFirmConfig;
  if (session.type === 'prop' && cfg?.maxPositionSize && data.quantity > cfg.maxPositionSize) {
    throw new HttpError(400, `Max position size is ${cfg.maxPositionSize}`);
  }
  await requireStrategy(userId, data.strategyId);

  const stopLoss = data.stopLoss ?? null;
  const takeProfit = data.takeProfit ?? null;
  assertBrackets({ side: data.side, entryPrice: data.entryPrice, stopLoss, takeProfit });

  // One live position OR resting order per symbol (pending orders have no exitTime either).
  const active = await prisma.backtestTrade.findFirst({
    where: { sessionId, symbol: data.symbol, exitTime: null },
    select: { orderType: true, filledAt: true },
  });
  if (active) {
    const pending = active.orderType !== 'market' && !active.filledAt;
    throw new HttpError(
      409,
      pending
        ? `You already have a pending ${data.symbol} order. Cancel it first.`
        : `You already have an open ${data.symbol} position. Close it first.`,
    );
  }
  const orderType = data.orderType || 'market';
  const pendingOrder = orderType !== 'market';

  // Idempotency: check for existing trade with same key
  if (data.idempotencyKey) {
    const existing = await prisma.backtestTrade.findFirst({
      where: { sessionId, idempotencyKey: data.idempotencyKey },
      select: { id: true, tradeId: true },
    });
    if (existing) {
      // Return the existing trade instead of creating a duplicate
      const t = await prisma.backtestTrade.findUnique({
        where: { id: existing.id },
        include: { strategy: true },
      });
      return serializeTrade(t);
    }
  }

  try {
    const t = await prisma.backtestTrade.create({
      data: {
        sessionId,
        tradeId: data.tradeId || `bt_${randomUUID()}`,
        symbol: data.symbol,
        side: data.side,
        entryTime: new Date(data.entryTime),
        entryPrice: data.entryPrice,
        orderType,
        orderPrice: pendingOrder ? data.entryPrice : null,
        filledAt: pendingOrder ? null : new Date(data.entryTime),
        quantity: data.quantity,
        stopLoss,
        takeProfit,
        slPoints: slPointsFrom(data.entryPrice, stopLoss),
        commission: data.commission ?? null,
        strategyId: data.strategyId ?? null,
        notes: data.notes ?? '',
        pnl: 0,
        idempotencyKey: data.idempotencyKey ?? undefined,
      },
      include: { strategy: true },
    });
    await prisma.backtestSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
    notify(userId);
    return serializeTrade(t);
  } catch (err) {
    if (err.code === 'P2002') throw new HttpError(409, 'Trade already exists');
    throw err;
  }
}

export async function updateTrade(userId, sessionId, tradeId, patch) {
  const session = await requireSession(userId, sessionId);
  assertWritable(session);

  const trade = await prisma.backtestTrade.findFirst({ where: { sessionId, tradeId } });
  if (!trade) throw new HttpError(404, 'Trade not found');

  const isClosed = trade.exitTime != null;
  const isPending = !isClosed && trade.orderType !== 'market' && !trade.filledAt;
  const data = {};

  // Pending -> open: the replay reached the order price.
  if (patch.fillTime !== undefined || patch.fillPrice !== undefined) {
    if (!isPending) throw new HttpError(409, 'This order is not pending.');
    if (patch.fillTime === undefined || patch.fillPrice === undefined) {
      throw new HttpError(400, 'fillTime and fillPrice are required together');
    }
    const fillTime = new Date(patch.fillTime);
    if (fillTime < trade.entryTime) throw new HttpError(400, 'Fill can’t be before the order was placed');
    data.entryTime = fillTime;
    data.entryPrice = patch.fillPrice;
    data.filledAt = fillTime;
    data.slPoints = slPointsFrom(patch.fillPrice, trade.stopLoss);
  }

  if (patch.notes !== undefined) data.notes = patch.notes;
  if (patch.commission !== undefined) data.commission = patch.commission;
  if (patch.strategyId !== undefined) {
    await requireStrategy(userId, patch.strategyId);
    data.strategyId = patch.strategyId;
  }

  const wantsExit = patch.exitTime !== undefined || patch.exitPrice !== undefined;
  const wantsBrackets = patch.stopLoss !== undefined || patch.takeProfit !== undefined;

  if ((wantsExit || wantsBrackets) && isClosed) {
    throw new HttpError(409, 'This trade is already closed.');
  }
  if (wantsExit && isPending) throw new HttpError(409, 'Cancel the pending order instead of closing it.');

  if (wantsBrackets) {
    const stopLoss = patch.stopLoss !== undefined ? patch.stopLoss : trade.stopLoss;
    const takeProfit = patch.takeProfit !== undefined ? patch.takeProfit : trade.takeProfit;
    assertBrackets({ side: trade.side, entryPrice: trade.entryPrice, stopLoss, takeProfit });
    data.stopLoss = stopLoss;
    data.takeProfit = takeProfit;
    data.slPoints = slPointsFrom(trade.entryPrice, stopLoss);
  }

  if (wantsExit) {
    if (patch.exitTime === undefined || patch.exitPrice === undefined) {
      throw new HttpError(400, 'exitTime and exitPrice are required together');
    }
    const exitTime = new Date(patch.exitTime);
    if (exitTime < trade.entryTime) throw new HttpError(400, 'Exit can’t be before entry');

    // A5: Server-side fill validation - re-simulate SL/TP against market bars
    const validation = await validateFillAgainstBars({
      symbol: trade.symbol,
      side: trade.side,
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      exitTime: exitTime.toISOString(),
      exitPrice: patch.exitPrice,
      interval: session.interval,
    });

    if (validation && !validation.validated) {
      // Validation failed: reject or warn based on reason
      if (validation.reason === 'price_deviation') {
        throw new HttpError(
          400,
          `Exit price ${patch.exitPrice} differs from validated price ${validation.expectedPrice} (${validation.reason})`.replace(/\s+\([^)]+\)$/, '')
        );
      }
      if (validation.reason === 'no_data') {
        // No market data - warn but allow (manual override possible)
        console.warn(`[validateFill] No data for ${trade.symbol}, allowing manual close`);
      }
    }

    const finalExitPrice = validation?.exitPrice ?? patch.exitPrice;
    data.exitTime = exitTime;
    data.exitPrice = finalExitPrice;
    data.exitReason = patch.exitReason ?? 'manual';
    // The server is the single source of truth for P&L.
    data.pnl = computeBacktestPnl({
      side: trade.side,
      entryPrice: trade.entryPrice,
      exitPrice: finalExitPrice,
      quantity: trade.quantity,
      symbol: trade.symbol,
    });
  }

  if (Object.keys(data).length === 0) {
    const same = await prisma.backtestTrade.findFirst({ where: { id: trade.id }, include: { strategy: true } });
    return serializeTrade(same);
  }

  const t = await prisma.backtestTrade.update({
    where: { id: trade.id },
    data,
    include: { strategy: true },
  });
  await prisma.backtestSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
  notify(userId);
  return serializeTrade(t);
}

export async function deleteTrade(userId, sessionId, tradeId) {
  const session = await requireSession(userId, sessionId);
  assertWritable(session);
  const trade = await prisma.backtestTrade.findFirst({ where: { sessionId, tradeId }, select: { id: true } });
  if (!trade) throw new HttpError(404, 'Trade not found');
  await prisma.backtestTrade.delete({ where: { id: trade.id } });
  notify(userId);
  return { ok: true };
}
