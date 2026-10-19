// apps/api/src/routes/ai.routes.js
//
// BYOK routes mounted at /api/ai.
// All routes require authentication.

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../lib/rateLimit.js';
import * as ctrl from '../controllers/ai.controller.js';

export const aiRoutes = Router();

aiRoutes.use(requireAuth);

// Limit key-testing to prevent abuse (5 tests per minute)
const testLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  message: 'Too many key tests. Please wait a minute.',
});

aiRoutes.get('/providers', ctrl.listProviders);
aiRoutes.get('/settings', ctrl.getSettings);
aiRoutes.post('/settings', ctrl.saveSettings);
aiRoutes.patch('/settings/:provider/models', ctrl.updateModels);
aiRoutes.delete('/settings/:provider', ctrl.deleteSettings);

aiRoutes.post('/test', testLimiter, ctrl.testKey);