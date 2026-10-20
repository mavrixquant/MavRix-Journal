
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/gex.controller.js';

export const gexRoutes = Router();

gexRoutes.use(requireAuth);

gexRoutes.get('/', ctrl.list);

gexRoutes.get('/:date', ctrl.get);