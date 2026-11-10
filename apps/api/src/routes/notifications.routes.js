import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/notifications.controller.js';

export const notificationsRoutes = Router();

notificationsRoutes.use(requireAuth);

// Specific routes first so /unread-count, /read-all, /read-clear never
// collide with /:id.
notificationsRoutes.get('/unread-count',   ctrl.unreadCount);
notificationsRoutes.post('/read-all',      ctrl.markAllRead);
notificationsRoutes.post('/read-clear',    ctrl.clearRead);
notificationsRoutes.post('/read-friends',  ctrl.markFriendRequestsRead);
notificationsRoutes.post('/:id/read',      ctrl.markRead);
notificationsRoutes.delete('/:id',         ctrl.remove);
notificationsRoutes.get('/',               ctrl.list);