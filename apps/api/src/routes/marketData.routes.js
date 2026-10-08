// apps/api/src/routes/marketData.routes.js

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/marketData.controller.js';

export const marketDataRoutes = Router();

marketDataRoutes.use(requireAuth);

// Order matters: /quotes before /quote (otherwise /quote matches prefix)
marketDataRoutes.get('/catalog', ctrl.catalog);
marketDataRoutes.get('/bars', ctrl.bars);
marketDataRoutes.get('/quotes', ctrl.quotes);
marketDataRoutes.get('/quote', ctrl.quote);