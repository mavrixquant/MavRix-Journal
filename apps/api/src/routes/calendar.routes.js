import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as calendarController from '../controllers/calendar.controller.js';

export const calendarRoutes = Router();

calendarRoutes.use(requireAuth);

calendarRoutes.get('/', calendarController.list);
calendarRoutes.get('/currencies', calendarController.currencies);
calendarRoutes.get('/meta', calendarController.meta);
calendarRoutes.post('/sync', calendarController.sync);
calendarRoutes.get('/:id', calendarController.get);