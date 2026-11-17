import { z } from 'zod';

/* ============================================================================
   Backtester — shared constants, P&L maths and validators.
   Used by BOTH apps/api (authoritative) and apps/web (previews / prop HUD).
   ============================================================================ */

export const BACKTEST_SESSION_TYPES = ['standard', 'prop'];
export const BACKTEST_STATUSES = ['active', 'completed', 'archived'];
export const BACKTEST_SIDES = ['long', 'short'];
export const BACKTEST_EXIT_REASONS = ['manual', 'sl', 'tp', 'prop_breach', 'conclude'];

export const BACKTEST_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];
export const BACKTEST_INTERVAL_SECONDS = {
  '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400,
};

/** Max replay range per base interval (days). Keeps bar counts loadable in-browser. */
export const BACKTEST_INTERVAL_MAX_DAYS = {
  '1m': 31, '5m': 186, '15m': 365, '1h': 730, '4h': 1460, '1d': 3650,
};

export const BACKTEST_MAX_INSTRUMENTS = 8;
export const BACKTEST_DEFAULT_INSTRUMENT = 'NQ';

export const PROP_FIRMS = ['FTMO', 'Topstep', 'Apex', 'MyFundedFX', 'Other'];

export const PROP_DEFAULTS = {
  profitTargetPct: 10,
  maxDailyLossPct: 5,
  maxTotalLossPct: 10,
  minTradingDays: 5,
};

/**
 * Contract specs used to turn price points into account currency.
 * pointValue = currency per 1.0 price point per contract/unit.
 * Symbols that are not listed fall back to pointValue 1 (P&L == price points x qty).
 * ADJUST THIS MAP so the codes match your market catalog.
 */
export const FUTURES_SPECS = {
  NQ:  { pointValue: 20 },
  MNQ: { pointValue: 2 },
  ES:  { pointValue: 50 },
  MES: { pointValue: 5 },
  YM:  { pointValue: 5 },
  MYM: { pointValue: 0.5 },
  RTY: { pointValue: 50 },
  M2K: { pointValue: 5 },
  CL:  { pointValue: 1000 },
  MCL: { pointValue: 100 },
  GC:  { pointValue: 100 },
  MGC: { pointValue: 10 },
  SI:  { pointValue: 5000 },
  NG:  { pointValue: 10000 },
  ZB:  { pointValue: 1000 },
  ZN:  { pointValue: 1000 },
  '6E': { pointValue: 125000 },
};

export function getPointValue(symbol) {
  const key = String(symbol || '').toUpperCase().replace(/[0-9]*!$/, '');
  return FUTURES_SPECS[key]?.pointValue ?? 1;
}

const round = (n, d = 2) => {
  const f = 10 ** d;
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
};

/** Gross P&L (commission is stored separately, same as the journal Trade model). */
export function computeBacktestPnl({ side, entryPrice, exitPrice, quantity, symbol }) {
  const dir = String(side).toLowerCase() === 'short' ? -1 : 1;
  const pts = (Number(exitPrice) - Number(entryPrice)) * dir;
  return round(pts * Number(quantity) * getPointValue(symbol));
}

/* ------------------------------ validators ------------------------------ */

const num = z.number().finite();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const propFirmConfigSchema = z
  .object({
    firmName: z.enum(PROP_FIRMS),
    firmNameCustom: z.string().trim().max(60).optional(),
    accountSize: num.positive(),
    profitTargetPct: num.positive().max(100).default(PROP_DEFAULTS.profitTargetPct),
    maxDailyLossPct: num.positive().max(100).default(PROP_DEFAULTS.maxDailyLossPct),
    maxTotalLossPct: num.positive().max(100).default(PROP_DEFAULTS.maxTotalLossPct),
    minTradingDays: z.number().int().min(0).max(365).default(PROP_DEFAULTS.minTradingDays),
    maxPositionSize: num.positive().optional().nullable(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((c) => c.firmName !== 'Other' || !!c.firmNameCustom, {
    message: 'Enter the firm name',
    path: ['firmNameCustom'],
  });

const sessionBase = z.object({
  name: z.string().trim().min(1, 'Give the session a name').max(80),
  type: z.enum(BACKTEST_SESSION_TYPES).default('standard'),
  currency: z.string().trim().min(3).max(3).default('USD'),
  startingBalance: num.positive(),
  fromDate: isoDate,
  toDate: isoDate,
  instruments: z
    .array(z.string().trim().toUpperCase().min(1).max(20))
    .min(1)
    .max(BACKTEST_MAX_INSTRUMENTS)
    .default([BACKTEST_DEFAULT_INSTRUMENT]),
  interval: z.enum(BACKTEST_INTERVALS).default('5m'),
  propFirmConfig: propFirmConfigSchema.nullable().optional(),
});

function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

export const backtestSessionSchema = sessionBase.superRefine((s, ctx) => {
  if (s.fromDate > s.toDate) {
    ctx.addIssue({ code: 'custom', path: ['toDate'], message: 'End date must be after the start date' });
  } else {
    const max = BACKTEST_INTERVAL_MAX_DAYS[s.interval];
    if (daysBetween(s.fromDate, s.toDate) + 1 > max) {
      ctx.addIssue({
        code: 'custom',
        path: ['toDate'],
        message: `${s.interval} sessions can cover at most ${max} days`,
      });
    }
  }
  if (s.type === 'prop' && !s.propFirmConfig) {
    ctx.addIssue({ code: 'custom', path: ['propFirmConfig'], message: 'Prop firm rules are required' });
  }
});

export const backtestSessionPatchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  status: z.enum(BACKTEST_STATUSES).optional(),
  replayTime: z.string().datetime().nullable().optional(),
  // Only accepted while the session has no trades (service enforces):
  type: z.enum(BACKTEST_SESSION_TYPES).optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  startingBalance: num.positive().optional(),
  fromDate: isoDate.optional(),
  toDate: isoDate.optional(),
  instruments: z.array(z.string().trim().toUpperCase().min(1).max(20)).min(1).max(BACKTEST_MAX_INSTRUMENTS).optional(),
  interval: z.enum(BACKTEST_INTERVALS).optional(),
  propFirmConfig: propFirmConfigSchema.nullable().optional(),
});

export const backtestTradeCreateSchema = z.object({
  tradeId: z.string().trim().min(1).max(80).optional(),
  symbol: z.string().trim().toUpperCase().min(1).max(20),
  side: z.enum(BACKTEST_SIDES),
  entryTime: z.string().datetime(),
  entryPrice: num.positive(),
  quantity: num.positive(),
  stopLoss: num.positive().nullable().optional(),
  takeProfit: num.positive().nullable().optional(),
  commission: num.min(0).nullable().optional(),
  strategyId: z.string().trim().min(1).nullable().optional(),
  notes: z.string().max(4000).optional(),
});

export const backtestTradePatchSchema = z.object({
  exitTime: z.string().datetime().optional(),
  exitPrice: num.positive().optional(),
  exitReason: z.enum(BACKTEST_EXIT_REASONS).optional(),
  stopLoss: num.positive().nullable().optional(),
  takeProfit: num.positive().nullable().optional(),
  commission: num.min(0).nullable().optional(),
  strategyId: z.string().trim().min(1).nullable().optional(),
  notes: z.string().max(4000).optional(),
});
