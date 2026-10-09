// apps/api/src/routes/strategies.routes.js
//
// User-facing strategy CRUD. Every route requires an authenticated user
// and every handler is scoped to that user's own strategies.

import { Router } from 'express';
import { strategySchema } from '@mavrix/shared/validators';
import { requireAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/strategies.controller.js';

export const strategiesRoutes = Router();

strategiesRoutes.use(requireAuth);

const validate = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (e) { next(e); }
};

strategiesRoutes.get('/', ctrl.list);
strategiesRoutes.post('/', validate(strategySchema), ctrl.create);
strategiesRoutes.get('/:id', ctrl.get);
strategiesRoutes.patch('/:id', validate(strategySchema.partial()), ctrl.update);
strategiesRoutes.post('/:id/archive', ctrl.archive);
strategiesRoutes.delete('/:id', ctrl.remove);