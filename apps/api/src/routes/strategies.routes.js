import { Router } from 'express';
import { strategySchema, strategyFilterSchema } from '@mavrix/shared/validators';
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

// req.query is read-only on newer Express, so parsed filters live on req.filters.
const withFilters = (req, _res, next) => {
  try {
    req.filters = strategyFilterSchema.parse(req.query);
    next();
  } catch (e) { next(e); }
};

strategiesRoutes.get('/', ctrl.list);
strategiesRoutes.get('/overview', withFilters, ctrl.overview); // must stay above /:id
strategiesRoutes.post('/', validate(strategySchema), ctrl.create);
strategiesRoutes.get('/:id', ctrl.get);
strategiesRoutes.get('/:id/performance', withFilters, ctrl.performance);
strategiesRoutes.patch('/:id', validate(strategySchema.partial()), ctrl.update);
strategiesRoutes.post('/:id/archive', ctrl.archive);
strategiesRoutes.post('/:id/duplicate', ctrl.duplicate);
strategiesRoutes.delete('/:id', ctrl.remove);
