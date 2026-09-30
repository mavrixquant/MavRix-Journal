import { Router } from 'express';
import { tradeBatchSchema } from '@mavrix/shared/validators';
import { requireAuth } from '../middleware/auth.js';
import * as tradesController from '../controllers/trades.controller.js';

export const tradesRoutes = Router();

tradesRoutes.use(requireAuth);

const validateBatch = (req, _res, next) => {
  try {
    req.body = tradeBatchSchema.parse(req.body);
    next();
  } catch (e) { next(e); }
};

// Collection
tradesRoutes.get('/', tradesController.list);
tradesRoutes.post('/', tradesController.create);
tradesRoutes.post('/bulk', validateBatch, tradesController.bulkCreate);

// Per-account operations (must come before /:id)
tradesRoutes.delete('/by-account/:accountId', tradesController.removeByAccount);
tradesRoutes.post('/by-account/:accountId/columns', tradesController.addColumn);
tradesRoutes.delete('/by-account/:accountId/columns/:name', tradesController.deleteColumn);
tradesRoutes.patch('/by-account/:accountId/columns/:name', tradesController.renameColumn);

// Value-level operations on a single column
tradesRoutes.post(
  '/by-account/:accountId/columns/:name/rename-value',
  tradesController.renameColumnValue
);
tradesRoutes.post(
  '/by-account/:accountId/columns/:name/clear-value',
  tradesController.clearColumnValue
);

// Single trade
tradesRoutes.get('/:id', tradesController.get);
tradesRoutes.patch('/:id', tradesController.update);
tradesRoutes.delete('/:id', tradesController.remove);