// packages/shared/src/validators.js
import { z } from 'zod';
import {
  ACCOUNT_TYPES, CURRENCIES, RISK_TYPES, RISK_UNITS,
  SL_UNITS, COMMISSION_MODES, DIRECTIONS,
  STRATEGY_STATUSES, STRATEGY_DIRECTIONS, STRATEGY_COLORS,
} from './constants.js';
import { IMPACT_LEVELS, MAX_CALENDAR_EVENTS_PER_REQUEST } from './calendar.js';

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(128),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

/* ------------------------------------------------------------------ */
/*  Column configs                                                     */
/* ------------------------------------------------------------------ */

const columnTypeEnum = z.enum(['text', 'dropdown', 'number']);

const columnConfigEntrySchema = z.union([
  columnTypeEnum,
  z.object({
    type: columnTypeEnum,
    options: z.array(z.string().trim().min(1)).max(200).optional(),
  }),
]);

const columnConfigsSchema = z.record(columnConfigEntrySchema).default({});

/* ------------------------------------------------------------------ */
/*  Account                                                            */
/* ------------------------------------------------------------------ */

const decimal = z.number().finite();

export const accountSchema = z.object({
  name: z.string().trim().min(1).max(120),
  balance: decimal.nonnegative(),
  currency: z.enum(CURRENCIES),
  type: z.enum(ACCOUNT_TYPES),
  riskType: z.enum(RISK_TYPES).default('fixed'),
  riskValue: decimal.nonnegative().nullable().optional(),
  riskUnit: z.enum(RISK_UNITS).nullable().optional(),
  slValue: decimal.nonnegative().nullable().optional(),
  slUnit: z.enum(SL_UNITS).nullable().optional(),
  commissionMode: z.enum(COMMISSION_MODES).default('none'),
  commissionValue: decimal.nonnegative().nullable().optional(),
  columnConfigs: columnConfigsSchema,
});

/* ------------------------------------------------------------------ */
/*  Strategy                                                           */
/* ------------------------------------------------------------------ */

// Accept only hex values from the shared palette.
const strategyColorEnum = z.enum(
  STRATEGY_COLORS.map((c) => c.hex)
);

export const strategySchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(2000).optional().default(''),
  rules: z.string().max(5000).optional().default(''),
  status: z.enum(STRATEGY_STATUSES).optional().default('active'),
  color: strategyColorEnum.optional().default('#F59E0B'),
  direction: z.enum(STRATEGY_DIRECTIONS).nullable().optional(),
  timeframe: z.string().trim().max(20).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
});

export const strategyUpdateSchema = strategySchema.partial();

/* ------------------------------------------------------------------ */
/*  Trade                                                              */
/* ------------------------------------------------------------------ */

export const tradeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entryTime: z.string().regex(/^\d{2}:\d{2}$/),
  exitTime: z.string().regex(/^\d{2}:\d{2}$/),
  direction: z.enum(DIRECTIONS),
  symbol: z.string().trim().max(30).optional().default(''),

  strategyId: z.string().min(1).nullable().optional(),

  mae: z.number().finite().nonnegative().nullable().optional(),
  mfe: z.number().finite().nonnegative().nullable().optional(),
  slPoints: z.number().finite().nonnegative().nullable().optional(),

  entryPrice: z.number().finite().nullable().optional(),
  takeProfit: z.number().finite().nullable().optional(),
  stopLoss: z.number().finite().nullable().optional(),

  pnl: z.number().finite().default(0),
  quantity: z.number().finite().positive().nullable().optional(),
  notes: z.string().max(2000).optional().default(''),
}).passthrough();

export const tradeBatchSchema = z.object({
  accountId: z.string().min(1),
  trades: z.array(tradeSchema).min(1).max(5000),
  columnConfigs: columnConfigsSchema.optional(),
});

/* ------------------------------------------------------------------ */
/*  User layout                                                        */
/* ------------------------------------------------------------------ */

export const layoutItemSchema = z.object({
  i: z.string(),
  x: z.number().int(),
  y: z.number().int(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  minW: z.number().int().positive().optional(),
  minH: z.number().int().positive().optional(),
  visible: z.boolean().optional(),
});

export const layoutSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(24),
  layout: z.array(layoutItemSchema),
});

/* ------------------------------------------------------------------ */
/*  Economic Calendar                                                  */
/* ------------------------------------------------------------------ */

const csvToArray = (v) => {
  if (v === undefined || v === null || v === '') return [];
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  return String(v).split(',').map((s) => s.trim()).filter(Boolean);
};

export const calendarQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD'),
  currency: z.preprocess(csvToArray, z.array(z.string().min(1).max(8))),
  impact: z.preprocess(csvToArray, z.array(z.enum(IMPACT_LEVELS))),
  limit: z.preprocess(
    (v) =>
      v === undefined || v === null || v === ''
        ? MAX_CALENDAR_EVENTS_PER_REQUEST
        : Number(v),
    z.number().int().positive().max(MAX_CALENDAR_EVENTS_PER_REQUEST)
  ),
});

/* ------------------------------------------------------------------ */
/*  GEX levels                                                         */
/* ------------------------------------------------------------------ */

// A single GEX level — { type, price, label }.
export const gexLevelSchema = z.object({
  type: z.string().trim().min(1).max(20),
  price: z.number().finite(),
  label: z.string().trim().min(1).max(500),
});

// Payload for POST /api/admin/gex — the whole day's worth of levels.
//
// `converted` is REQUIRED — the server re-serializes `levels` and rejects
// any mismatch. This prevents a client from tampering with the pipe-string
// that the user will later copy into TradingView.
export const gexDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  levels: z.array(gexLevelSchema).min(1).max(500),
  converted: z.string().min(1).max(20000),
  sourceTimezone: z.string().trim().min(1).max(64).optional(),
});