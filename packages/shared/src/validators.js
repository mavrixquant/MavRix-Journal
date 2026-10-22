import { z } from 'zod';
import {
  ACCOUNT_TYPES, CURRENCIES, RISK_TYPES, RISK_UNITS,
  SL_UNITS, COMMISSION_MODES, DIRECTIONS,
  STRATEGY_STATUSES, STRATEGY_DIRECTIONS, STRATEGY_COLORS,
  GROUP_VISIBILITIES, GROUP_ROLES, GROUP_COLORS,
  GROUP_NAME_MAX, GROUP_DESCRIPTION_MAX, GROUP_ICON_EMOJI_MAX,
  GROUP_DISCOVER_DEFAULT_LIMIT, GROUP_DISCOVER_MAX_LIMIT,
} from './constants.js';
import { IMPACT_LEVELS, MAX_CALENDAR_EVENTS_PER_REQUEST } from './calendar.js';
import { GEX_SYMBOLS } from './gex.js';


export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(128),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(320),
  password: z.string().min(1).max(128),
});

export const setUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be 30 characters or fewer')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, digits, and underscores')
    .transform(function (s) { return s.toLowerCase(); }),
});

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, 'Username must be 3-30 chars: a-z, 0-9, _');


const columnTypeEnum = z.enum(['text', 'dropdown', 'number']);

const columnConfigEntrySchema = z.union([
  columnTypeEnum,
  z.object({
    type: columnTypeEnum,
    options: z.array(z.string().trim().min(1)).max(200).optional(),
  }),
]);

const columnConfigsSchema = z.record(columnConfigEntrySchema).default({});


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


const groupColorEnum = z.enum(GROUP_COLORS.map((c) => c.hex));

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(GROUP_NAME_MAX),
  description: z.string().trim().max(GROUP_DESCRIPTION_MAX).optional().default(''),
  visibility: z.enum(GROUP_VISIBILITIES).optional().default('public'),
  color: groupColorEnum.optional().default('#F59E0B'),
  iconEmoji: z.string().trim().max(GROUP_ICON_EMOJI_MAX).nullable().optional(),
  initialMemberIds: z.array(z.string().min(1).max(64)).max(500).optional().default([]),
});

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(GROUP_NAME_MAX).optional(),
  description: z.string().trim().max(GROUP_DESCRIPTION_MAX).optional(),
  visibility: z.enum(GROUP_VISIBILITIES).optional(),
  color: groupColorEnum.optional(),
  iconEmoji: z.string().trim().max(GROUP_ICON_EMOJI_MAX).nullable().optional(),
});

export const groupMemberAddSchema = z.object({
  userId: z.string().min(1).max(64),
});

export const groupMemberRoleSchema = z.object({
  role: z.enum(GROUP_ROLES),
});

export const groupDiscoverQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
  limit: z.preprocess(
    (v) =>
      v === undefined || v === null || v === ''
        ? GROUP_DISCOVER_DEFAULT_LIMIT
        : Number(v),
    z.number().int().min(1).max(GROUP_DISCOVER_MAX_LIMIT)
  ),
});


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


// ---------------------------------------------------------------------------
// GEX — levels + day payload.
//
// `gexDaySchema.symbol` defaults to 'NQ' so pre-refactor clients keep working;
// the frontend always sends the symbol explicitly.
// ---------------------------------------------------------------------------
const gexSymbolEnum = z.enum(GEX_SYMBOLS);

export const gexLevelSchema = z.object({
  type: z.string().trim().min(1).max(20),
  price: z.number().finite(),
  label: z.string().trim().min(1).max(500),
});

export const gexDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  symbol: gexSymbolEnum.optional().default('NQ'),
  levels: z.array(gexLevelSchema).min(1).max(500),
  converted: z.string().min(1).max(20000),
  sourceTimezone: z.string().trim().min(1).max(64).optional(),
});


export const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  replyToId: z.string().min(1).nullable().optional(),
});

export const editMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const typingSchema = z.object({
  isTyping: z.boolean(),
});

export const createDmSchema = z.object({
  peerId: z.string().min(1).max(64),
});

export const userSearchSchema = z.object({
  q: z.string().trim().min(2).max(100),
});

export const updateConversationSchema = z.object({
  isPinned: z.boolean().optional(),
  isMuted: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const aiCredentialSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini', 'groq', 'deepseek']),
  apiKey: z.string().trim().min(10).max(500),
  model: z.string().trim().max(100).optional().nullable(),
});


// Password management schemas
export const setPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: z.string().min(6, 'Password must be at least 6 characters').max(128),
});
