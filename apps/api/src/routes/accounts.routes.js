// apps/api/src/routes/accounts.routes.js
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

// Accept both the legacy string form and the v2 object form for each
// entry of columnConfigs. Mirrors the shape accepted by accountSchema in
// @mavrix/shared/validators.
const columnTypeEnum = z.enum(['text', 'dropdown', 'number']);

const columnConfigEntrySchema = z.union([
  columnTypeEnum,
  z.object({
    type: columnTypeEnum,
    options: z.array(z.string().trim().min(1)).max(200).optional(),
  }),
]);

const columnConfigsSchema = z.object({
  columnConfigs: z.record(columnConfigEntrySchema).default({}),
});

accountsRoutes.get('/', accountsController.list);
accountsRoutes.post('/', validate(accountSchema), accountsController.create);
accountsRoutes.get('/:id', accountsController.get);
accountsRoutes.patch('/:id', validate(accountSchema.partial()), accountsController.update);
accountsRoutes.patch('/:id/column-configs', validate(columnConfigsSchema), accountsController.updateColumnConfigs);
accountsRoutes.delete('/:id', accountsController.remove);