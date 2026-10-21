import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../lib/rateLimit.js';
import * as ctrl from '../controllers/bugReport.controller.js';

export const bugReportRoutes = Router();

bugReportRoutes.use(requireAuth);

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many bug reports submitted. Please try again later.',
});

bugReportRoutes.post('/', submitLimiter, ctrl.create);