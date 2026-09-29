// apps/api/src/routes/calendar.routes.js
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as calendarController from '../controllers/calendar.controller.js';

export const calendarRoutes = Router();

// Every calendar route requires an authenticated user.
// The calendar is read-only, but it is not public — it lives behind
// the same auth gate as the rest of the app.
calendarRoutes.use(requireAuth);

calendarRoutes.get('/', calendarController.list);
calendarRoutes.get('/currencies', calendarController.currencies);
calendarRoutes.get('/meta', calendarController.meta);
calendarRoutes.post('/sync', calendarController.sync);
calendarRoutes.get('/:id', calendarController.get);