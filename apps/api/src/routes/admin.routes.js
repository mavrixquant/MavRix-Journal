import { Router } from 'express';
import { z } from 'zod';
import {
  gexDaySchema,
  createGroupSchema,
  updateGroupSchema,
  groupMemberAddSchema,
  groupMemberRoleSchema,
} from '@mavrix/shared/validators';
import { GEX_SYMBOLS } from '@mavrix/shared';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireSuperadmin } from '../middleware/admin.js';
import { HttpError } from '../middleware/error.js';
import { rateLimit } from '../lib/rateLimit.js';
import * as ctrl from '../controllers/admin.controller.js';
import * as accCtrl from '../controllers/adminAccounts.controller.js';
import * as tradeCtrl from '../controllers/adminTrades.controller.js';
import * as opsCtrl from '../controllers/adminOps.controller.js';
import * as gexCtrl from '../controllers/adminGex.controller.js';
import * as strategyCtrl from '../controllers/adminStrategies.controller.js';
import * as groupCtrl from '../controllers/adminGroups.controller.js';
import * as hcCtrl from '../controllers/healthCheck.controller.js';
import * as bugCtrl from '../controllers/adminBugReports.controller.js';
import * as marketDataCtrl from '../controllers/adminMarketData.controller.js';

export const adminRoutes = Router();

adminRoutes.use(requireAuth);
adminRoutes.use(requireAdmin);

const validate = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (e) { next(e); }
};

const validateSymbolQuery = (req, _res, next) => {
  const sym = req.query.symbol;
  if (sym && !GEX_SYMBOLS.includes(sym)) {
    return next(
      new HttpError(400, `Invalid symbol. Allowed: ${GEX_SYMBOLS.join(', ')}`)
    );
  }
  next();
};

const userUpdateSchema = z.object({
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/)
    .optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  role: z.enum(['user', 'admin', 'superadmin']).optional(),
});

const banSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

const settingsSchema = z.record(z.any());

const accountUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  balance: z.number().finite().nonnegative().optional(),
  currency: z.enum(['USD', 'EUR', 'INR', 'GBP']).optional(),
  type: z.enum(['Backtest', 'Live', 'Demo']).optional(),
});

const reassignSchema = z.object({
  newUserId: z.string().min(1),
});

const broadcastSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  level: z.enum(['info', 'warning', 'critical']).optional().default('info'),
  sendEmail: z.boolean().optional().default(false),
});

const healthCheckStartSchema = z.object({
  phases: z.array(z.string().min(1)).max(64).optional(),
});

const bugReportUpdateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  adminNote: z.string().trim().max(2000).nullable().optional(),
});

const sensitive = rateLimit({
  windowMs: 60_000,
  max: 20,
  message: 'Too many sensitive actions. Try again in a minute.',
});

const broadcastLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  message: 'Broadcast rate limit reached.',
});

const writeLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  message: 'Too many write operations. Slow down.',
});

const groupLimiter = rateLimit({
  windowMs: 60_000,
  max: 40,
  message: 'Too many group operations. Slow down.',
});

const healthCheckLimiter = rateLimit({
  windowMs: 10_000,
  max: 3,
  message: 'Health check launched too recently. Wait a few seconds.',
});

adminRoutes.get('/me', ctrl.me);
adminRoutes.get('/stats', ctrl.stats);
adminRoutes.get('/health', ctrl.health);

adminRoutes.get('/users', ctrl.listUsers);
adminRoutes.get('/users/:id', ctrl.getUser);
adminRoutes.patch('/users/:id', validate(userUpdateSchema), ctrl.updateUser);

adminRoutes.post('/users/:id/verify-email', sensitive, ctrl.verifyEmail);
adminRoutes.post('/users/:id/unverify-email', sensitive, ctrl.unverifyEmail);
adminRoutes.post('/users/:id/password-reset', sensitive, ctrl.triggerPasswordReset);

adminRoutes.post('/users/:id/ban', sensitive, validate(banSchema), ctrl.ban);
adminRoutes.post('/users/:id/unban', ctrl.unban);
adminRoutes.post('/users/:id/force-logout', ctrl.forceLogout);

adminRoutes.delete('/users/:id', requireSuperadmin, sensitive, ctrl.removeUser);

adminRoutes.get('/sessions', ctrl.sessions);
adminRoutes.get('/sessions/:id', ctrl.userSessions);
adminRoutes.post('/sessions/:id/disconnect', sensitive, opsCtrl.kickSession);

adminRoutes.get('/settings', ctrl.getSettingsCtrl);
adminRoutes.put('/settings', requireSuperadmin, validate(settingsSchema), ctrl.updateSettingsCtrl);

adminRoutes.get('/accounts', accCtrl.list);
adminRoutes.get('/accounts/:id', accCtrl.get);
adminRoutes.patch('/accounts/:id', writeLimiter, validate(accountUpdateSchema), accCtrl.update);
adminRoutes.post('/accounts/:id/reassign', requireSuperadmin, sensitive, validate(reassignSchema), accCtrl.reassign);
adminRoutes.delete('/accounts/:id', requireSuperadmin, sensitive, accCtrl.remove);

adminRoutes.get('/trades', tradeCtrl.list);
adminRoutes.delete('/trades/by-account/:accountId', writeLimiter, tradeCtrl.removeByAccount);
adminRoutes.delete('/trades/:id', writeLimiter, tradeCtrl.remove);

adminRoutes.get('/strategies', strategyCtrl.list);
adminRoutes.get('/strategies/:id', strategyCtrl.get);
adminRoutes.delete('/strategies/:id', requireSuperadmin, sensitive, strategyCtrl.remove);

adminRoutes.get('/groups', groupLimiter, groupCtrl.list);
adminRoutes.post('/groups', groupLimiter, validate(createGroupSchema), groupCtrl.create);

adminRoutes.get('/groups/:id', groupLimiter, groupCtrl.get);
adminRoutes.patch('/groups/:id', groupLimiter, validate(updateGroupSchema), groupCtrl.update);
adminRoutes.delete('/groups/:id', groupLimiter, groupCtrl.remove);

adminRoutes.post(
  '/groups/:id/members',
  groupLimiter,
  validate(groupMemberAddSchema),
  groupCtrl.addMember
);
adminRoutes.patch(
  '/groups/:id/members/:userId',
  groupLimiter,
  validate(groupMemberRoleSchema),
  groupCtrl.setMemberRole
);
adminRoutes.delete(
  '/groups/:id/members/:userId',
  groupLimiter,
  groupCtrl.removeMember
);

adminRoutes.get('/audit', opsCtrl.audit);

adminRoutes.post('/broadcast', broadcastLimiter, validate(broadcastSchema), opsCtrl.broadcast);

adminRoutes.post('/calendar/sync', sensitive, opsCtrl.calendarSync);
adminRoutes.delete('/calendar/cache', requireSuperadmin, sensitive, opsCtrl.calendarWipe);
adminRoutes.get('/calendar/logs', opsCtrl.calendarLogs);

// GEX — symbol-aware. GET/DELETE take ?symbol=..., POST takes symbol in body.
adminRoutes.get('/gex', validateSymbolQuery, gexCtrl.list);
adminRoutes.post('/gex', writeLimiter, validate(gexDaySchema), gexCtrl.upsert);
adminRoutes.delete('/gex/:date', requireSuperadmin, sensitive, validateSymbolQuery, gexCtrl.remove);

// Bug reports — new admin tab.
adminRoutes.get('/bug-reports', bugCtrl.list);
adminRoutes.patch('/bug-reports/:id', writeLimiter, validate(bugReportUpdateSchema), bugCtrl.update);
adminRoutes.delete('/bug-reports/:id', requireSuperadmin, sensitive, bugCtrl.remove);

adminRoutes.get(
  '/health-check/phases',
  requireSuperadmin,
  hcCtrl.listPhases
);
adminRoutes.post(
  '/health-check/run',
  requireSuperadmin,
  healthCheckLimiter,
  validate(healthCheckStartSchema),
  hcCtrl.start
);
adminRoutes.get(
  '/health-check/stream/:runId',
  requireSuperadmin,
  hcCtrl.stream
);
adminRoutes.get(
  '/health-check/status/:runId',
  requireSuperadmin,
  hcCtrl.status
);

// ---------------------------------------------------------------------------
// Market data cache � read stats, force import chunks, wipe per (symbol, interval).
// ---------------------------------------------------------------------------
const marketDataIntervalEnum = z.enum(['1m', '5m', '15m', '1h', '4h', '1d']);

const marketDataImportSchema = z.object({
  symbol:   z.string().trim().min(1).max(32),
  interval: marketDataIntervalEnum,
  from:     z.string().trim().min(1),
  to:       z.string().trim().min(1),
});

const marketDataWipeSchema = z.object({
  symbol:   z.string().trim().min(1).max(32),
  interval: marketDataIntervalEnum.optional().nullable(),
});

adminRoutes.get('/market-data/stats', marketDataCtrl.stats);
adminRoutes.get('/market-data/stats', marketDataCtrl.stats);
adminRoutes.post(
  '/market-data/import',
  writeLimiter,
  validate(marketDataImportSchema),
  marketDataCtrl.startJob
);
adminRoutes.get('/market-data/jobs', marketDataCtrl.listJobs);
adminRoutes.get('/market-data/jobs/:id', marketDataCtrl.getJob);
adminRoutes.get('/market-data/jobs/:id/chunks', marketDataCtrl.getChunks);
adminRoutes.post('/market-data/jobs/:id/stop', writeLimiter, marketDataCtrl.stopJob);
adminRoutes.delete(
  '/market-data/cache',
  requireSuperadmin,
  sensitive,
  validate(marketDataWipeSchema),
  marketDataCtrl.wipe
);
