import { Router } from 'express';
import {
  backtestSessionSchema,
  backtestSessionPatchSchema,
  backtestTradeCreateSchema,
  backtestTradePatchSchema,
} from '@mavrix/shared';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../lib/rateLimit.js';
import * as ctrl from '../controllers/backtestSessions.controller.js';

export const backtestSessionsRoutes = Router();

backtestSessionsRoutes.use(requireAuth);

const validate = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (e) { next(e); }
};

// Replay can place/close trades quickly (SL/TP auto-fills), so be generous.
const tradeWriteLimit = rateLimit({
  windowMs: 60_000,
  max: 240,
  message: 'Too many trade updates. Slow down.',
});
const sessionWriteLimit = rateLimit({
  windowMs: 60_000,
  max: 120,
  message: 'Too many session updates. Slow down.',
});

backtestSessionsRoutes.get('/', ctrl.list);
backtestSessionsRoutes.post('/', sessionWriteLimit, validate(backtestSessionSchema), ctrl.create);

backtestSessionsRoutes.get('/:id', ctrl.get);
backtestSessionsRoutes.patch('/:id', sessionWriteLimit, validate(backtestSessionPatchSchema), ctrl.update);
backtestSessionsRoutes.delete('/:id', sessionWriteLimit, ctrl.remove);

backtestSessionsRoutes.get('/:id/trades', ctrl.listTrades);
backtestSessionsRoutes.post('/:id/trades', tradeWriteLimit, validate(backtestTradeCreateSchema), ctrl.createTrade);
backtestSessionsRoutes.patch('/:id/trades/:tradeId', tradeWriteLimit, validate(backtestTradePatchSchema), ctrl.updateTrade);
backtestSessionsRoutes.delete('/:id/trades/:tradeId', tradeWriteLimit, ctrl.removeTrade);
