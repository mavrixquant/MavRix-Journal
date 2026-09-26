import { Router } from 'express';
import { z } from 'zod';
import { layoutSchema, layoutItemSchema } from '@mavrix/shared/validators';
import { requireAuth } from '../middleware/auth.js';
import * as usersController from '../controllers/users.controller.js';

export const usersRoutes = Router();

usersRoutes.use(requireAuth);

const validate = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (e) { next(e); }
};

// Partial schema for PATCH — id is immutable and set via URL.
const layoutUpdateSchema = z.object({
  name: z.string().trim().min(1).max(24).optional(),
  layout: z.array(layoutItemSchema).optional(),
});

usersRoutes.get('/layouts', usersController.listLayouts);
usersRoutes.post('/layouts', validate(layoutSchema), usersController.createLayout);
usersRoutes.patch('/layouts/:id', validate(layoutUpdateSchema), usersController.updateLayout);
usersRoutes.delete('/layouts/:id', usersController.deleteLayout);
usersRoutes.post('/layouts/:id/activate', usersController.activateLayout);