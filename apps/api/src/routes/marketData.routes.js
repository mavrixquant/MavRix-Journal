
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/marketData.controller.js';

export const marketDataRoutes = Router();

marketDataRoutes.use(requireAuth);

marketDataRoutes.get('/catalog', ctrl.catalog);
marketDataRoutes.get('/bars', ctrl.bars);
marketDataRoutes.get('/quotes', ctrl.quotes);
marketDataRoutes.get('/quote', ctrl.quote);