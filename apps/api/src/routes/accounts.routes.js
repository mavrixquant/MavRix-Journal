import { Router } from 'express';
import { z } from 'zod';
import { accountSchema } from '@mavrix/shared/validators';
import { requireAuth } from '../middleware/auth.js';
import * as accountsController from '../controllers/accounts.controller.js';

export const accountsRoutes = Router();

accountsRoutes.use(requireAuth);

const validate = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (e) { next(e); }
};

const columnConfigsSchema = z.object({
  columnConfigs: z.record(z.enum(['text', 'dropdown', 'number'])).default({}),
});

accountsRoutes.get('/', accountsController.list);
accountsRoutes.post('/', validate(accountSchema), accountsController.create);
accountsRoutes.get('/:id', accountsController.get);
accountsRoutes.patch('/:id', validate(accountSchema.partial()), accountsController.update);
accountsRoutes.patch('/:id/column-configs', validate(columnConfigsSchema), accountsController.updateColumnConfigs);
accountsRoutes.delete('/:id', accountsController.remove);
