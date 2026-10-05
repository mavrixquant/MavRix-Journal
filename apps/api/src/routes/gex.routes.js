// apps/api/src/routes/gex.routes.js
//
// User-facing GEX endpoints. Mounted at /api/gex.
//
// Every route requires an authenticated user. The data itself is not
// user-scoped (all users see the same uploaded levels), but it lives
// behind the same auth gate as the rest of the app.

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/gex.controller.js';

export const gexRoutes = Router();

gexRoutes.use(requireAuth);

// GET /api/gex            — list of uploaded dates (metadata only)
gexRoutes.get('/', ctrl.list);

// GET /api/gex/:date      — full payload for one date
gexRoutes.get('/:date', ctrl.get);