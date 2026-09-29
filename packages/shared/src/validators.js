// packages/shared/src/validators.js
import { z } from 'zod';
import {
  ACCOUNT_TYPES, CURRENCIES, RISK_TYPES, RISK_UNITS,
  SL_UNITS, COMMISSION_MODES, DIRECTIONS,
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
  columnConfigs: z.record(z.enum(['text', 'dropdown', 'number'])).default({}),
});

/* ------------------------------------------------------------------ */
/*  Trade                                                              */
/* ------------------------------------------------------------------ */

export const tradeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entryTime: z.string().regex(/^\d{2}:\d{2}$/),
  exitTime: z.string().regex(/^\d{2}:\d{2}$/),
  direction: z.enum(DIRECTIONS),
  symbol: z.string().trim().max(30).optional().default(''),
  mae: z.number().finite().nonnegative(),
  mfe: z.number().finite().nonnegative(),
  pnl: z.number().finite().default(0),
  slPoints: z.number().finite().nonnegative().nullable().optional(),
  contracts: z.number().int().positive().nullable().optional(),
  notes: z.string().max(2000).optional().default(''),
}).passthrough(); // allow arbitrary dynamic column keys at top level

export const tradeBatchSchema = z.object({
  accountId: z.string().min(1),
  trades: z.array(tradeSchema).min(1).max(5000),
  columnConfigs: z.record(z.enum(['text', 'dropdown', 'number'])).optional(),
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

// Express puts query params on req.query as either a string or an array
// (arrays happen when the same key is repeated: ?currency=USD&currency=EUR).
// Our web client always sends CSV, but Postman / curl users may send either.
// This helper normalizes both forms into a clean array of trimmed strings.
const csvToArray = (v) => {
  if (v === undefined || v === null || v === '') return [];
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  return String(v).split(',').map((s) => s.trim()).filter(Boolean);
};

// GET /api/calendar query contract.
//
//   from     — required, YYYY-MM-DD
//   to       — required, YYYY-MM-DD
//   currency — optional, CSV or array; uppercase ISO codes
//   impact   — optional, CSV or array; must be one of IMPACT_LEVELS
//   limit    — optional, integer 1..MAX_CALENDAR_EVENTS_PER_REQUEST
//
// After parsing, `currency` and `impact` are always arrays (possibly empty),
// and `limit` is always a number. Callers never need to re-check undefined.
export const calendarQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD'),
  currency: z.preprocess(
    csvToArray,
    z.array(z.string().min(1).max(8))
  ),
  impact: z.preprocess(
    csvToArray,
    z.array(z.enum(IMPACT_LEVELS))
  ),
  limit: z.preprocess(
    (v) =>
      v === undefined || v === null || v === ''
        ? MAX_CALENDAR_EVENTS_PER_REQUEST
        : Number(v),
    z.number().int().positive().max(MAX_CALENDAR_EVENTS_PER_REQUEST)
  ),
});