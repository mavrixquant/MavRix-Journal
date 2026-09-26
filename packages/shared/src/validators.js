import { z } from 'zod';
import {
  ACCOUNT_TYPES, CURRENCIES, RISK_TYPES, RISK_UNITS,
  SL_UNITS, COMMISSION_MODES, DIRECTIONS,
} from './constants.js';

// ---------- Auth ----------
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

// ---------- Account ----------
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

// ---------- Trade ----------
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

// ---------- User layout ----------
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