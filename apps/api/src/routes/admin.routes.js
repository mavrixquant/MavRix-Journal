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
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireSuperadmin } from '../middleware/admin.js';
import { rateLimit } from '../lib/rateLimit.js';
import * as ctrl from '../controllers/admin.controller.js';

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

/* ---------------- Rate limiters for sensitive actions ---------------- */
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

// Hard delete is superadmin-only.
adminRoutes.delete('/users/:id', requireSuperadmin, sensitive, ctrl.removeUser);

/* ---------------- Sessions ---------------- */
adminRoutes.get('/sessions', ctrl.sessions);
adminRoutes.get('/sessions/:id', ctrl.userSessions);

/* ---------------- Settings ---------------- */
adminRoutes.get('/settings', ctrl.getSettingsCtrl);
adminRoutes.put('/settings', requireSuperadmin, validate(settingsSchema), ctrl.updateSettingsCtrl);

/* ---------------- Placeholder mounts for Phase 3 ----------------
   Accounts, trades, audit, broadcast, calendar endpoints will be added
   in Phase 3. Route file already imports the shape they'll need. */