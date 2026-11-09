import { Router } from 'express';
import { z } from 'zod';
import { layoutSchema } from '@mavrix/shared/validators';
import { requireAuth } from '../middleware/auth.js';
import * as usersController from '../controllers/users.controller.js';
import * as preferencesController from '../controllers/preferences.controller.js';

export const usersRoutes = Router();

usersRoutes.use(requireAuth);

const validate = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (e) { next(e); }
};

// Local shape — matches what dashboardLayout.js produces via P().
// Previously pulled from @mavrix/shared/validators, but that export is
// missing/undefined and made Zod v4 throw
//   "Cannot read properties of undefined (reading 'run')"
// on every PATCH /layouts/:id. Defined locally so save is not dependent
// on a shared-package change.
const layoutItemSchema = z.object({
  i: z.string().min(1),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minW: z.number().optional(),
  minH: z.number().optional(),
  visible: z.boolean().optional(),
});

const layoutUpdateSchema = z.object({
  name: z.string().trim().min(1).max(24).optional(),
  layout: z.array(layoutItemSchema).optional(),
});


usersRoutes.get('/preferences', preferencesController.get);
usersRoutes.put('/preferences', preferencesController.put);


usersRoutes.get('/layouts', usersController.listLayouts);
usersRoutes.post('/layouts', validate(layoutSchema), usersController.createLayout);
usersRoutes.patch('/layouts/:id', validate(layoutUpdateSchema), usersController.updateLayout);
usersRoutes.delete('/layouts/:id', usersController.deleteLayout);
usersRoutes.post('/layouts/:id/activate', usersController.activateLayout);