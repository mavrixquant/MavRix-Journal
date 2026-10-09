// apps/api/src/routes/admin.routes.js
//
// All admin endpoints. Mounted at /api/admin.
//
// Mount order:
//   1. requireAuth   — Bearer token + sv check
//   2. requireAdmin  — gate the whole subtree
//   3. per-route extra guards (requireSuperadmin) for role-changing actions

import { Router } from 'express';
import { z } from 'zod';
import { gexDaySchema } from '@mavrix/shared/validators';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireSuperadmin } from '../middleware/admin.js';
import { rateLimit } from '../lib/rateLimit.js';
import * as ctrl from '../controllers/admin.controller.js';
import * as accCtrl from '../controllers/adminAccounts.controller.js';
import * as tradeCtrl from '../controllers/adminTrades.controller.js';
import * as opsCtrl from '../controllers/adminOps.controller.js';
import * as gexCtrl from '../controllers/adminGex.controller.js';
import * as strategyCtrl from '../controllers/adminStrategies.controller.js';

export const adminRoutes = Router();

/* ---------------- Global auth gate ---------------- */
adminRoutes.use(requireAuth);
adminRoutes.use(requireAdmin);

/* ---------------- Validation ---------------- */
const validate = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (e) { next(e); }
};

const userUpdateSchema = z.object({
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
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
  riskType: z.enum(['fixed', 'variable']).optional(),
  riskValue: z.number().finite().nonnegative().nullable().optional(),
  riskUnit: z.enum(['percent', 'amount']).nullable().optional(),
  slValue: z.number().finite().nonnegative().nullable().optional(),
  slUnit: z.enum(['ticks', 'points']).nullable().optional(),
  commissionMode: z.enum(['none', 'flat', 'per_contract']).optional(),
  commissionValue: z.number().finite().nonnegative().nullable().optional(),
});

const reassignSchema = z.object({
  newUserId: z.string().min(1),
});

const broadcastSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  level: z.enum(['info', 'warning', 'critical']).optional().default('info'),
  sendEmail: z.boolean().optional().default(false),
});

/* ---------------- Rate limiters ---------------- */
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

/* ---------------- Me / Stats / Health ---------------- */
adminRoutes.get('/me', ctrl.me);
adminRoutes.get('/stats', ctrl.stats);
adminRoutes.get('/health', ctrl.health);

/* ---------------- Users ---------------- */
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

/* ---------------- Sessions ---------------- */
adminRoutes.get('/sessions', ctrl.sessions);
adminRoutes.get('/sessions/:id', ctrl.userSessions);
adminRoutes.post('/sessions/:id/disconnect', sensitive, opsCtrl.kickSession);

/* ---------------- Settings ---------------- */
adminRoutes.get('/settings', ctrl.getSettingsCtrl);
adminRoutes.put('/settings', requireSuperadmin, validate(settingsSchema), ctrl.updateSettingsCtrl);

/* ---------------- Accounts ---------------- */
adminRoutes.get('/accounts', accCtrl.list);
adminRoutes.get('/accounts/:id', accCtrl.get);
adminRoutes.patch('/accounts/:id', writeLimiter, validate(accountUpdateSchema), accCtrl.update);
adminRoutes.post('/accounts/:id/reassign', requireSuperadmin, sensitive, validate(reassignSchema), accCtrl.reassign);
adminRoutes.delete('/accounts/:id', requireSuperadmin, sensitive, accCtrl.remove);

/* ---------------- Trades ---------------- */
adminRoutes.get('/trades', tradeCtrl.list);
// Order matters: by-account before /:id
adminRoutes.delete('/trades/by-account/:accountId', writeLimiter, tradeCtrl.removeByAccount);
adminRoutes.delete('/trades/:id', writeLimiter, tradeCtrl.remove);

/* ---------------- Strategies ---------------- */
adminRoutes.get('/strategies', strategyCtrl.list);
adminRoutes.get('/strategies/:id', strategyCtrl.get);
adminRoutes.delete('/strategies/:id', requireSuperadmin, sensitive, strategyCtrl.remove);

/* ---------------- Audit ---------------- */
adminRoutes.get('/audit', opsCtrl.audit);

/* ---------------- Broadcast ---------------- */
adminRoutes.post('/broadcast', broadcastLimiter, validate(broadcastSchema), opsCtrl.broadcast);

/* ---------------- Calendar ---------------- */
adminRoutes.post('/calendar/sync', sensitive, opsCtrl.calendarSync);
adminRoutes.delete('/calendar/cache', requireSuperadmin, sensitive, opsCtrl.calendarWipe);
adminRoutes.get('/calendar/logs', opsCtrl.calendarLogs);

/* ---------------- GEX Levels ---------------- */
// GET    /api/admin/gex              — list every uploaded day
// POST   /api/admin/gex              — upsert (409 unless ?overwrite=true)
// DELETE /api/admin/gex/:date        — superadmin only
adminRoutes.get('/gex', gexCtrl.list);
adminRoutes.post('/gex', writeLimiter, validate(gexDaySchema), gexCtrl.upsert);
adminRoutes.delete('/gex/:date', requireSuperadmin, sensitive, gexCtrl.remove);