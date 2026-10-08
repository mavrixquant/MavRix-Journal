// apps/api/src/routes/marketData.routes.js
//
// Mounted at /api/market-data. All routes require an authenticated user.

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/marketData.controller.js';

export const marketDataRoutes = Router();

marketDataRoutes.use(requireAuth);

// GET /api/market-data/catalog
// Returns the fixed symbol catalog + supported intervals.
marketDataRoutes.get('/catalog', ctrl.catalog);

// GET /api/market-data/bars?symbol=NQ&interval=5m&range=5d
marketDataRoutes.get('/bars', ctrl.bars);

// GET /api/market-data/quote?symbol=NQ
marketDataRoutes.get('/quote', ctrl.quote);