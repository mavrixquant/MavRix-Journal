// apps/api/src/routes/index.js
import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { accountsRoutes } from './accounts.routes.js';
import { tradesRoutes } from './trades.routes.js';
import { usersRoutes } from './users.routes.js';
import { calendarRoutes } from './calendar.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

apiRouter.use('/auth', authRoutes);
apiRouter.use('/accounts', accountsRoutes);
apiRouter.use('/trades', tradesRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/calendar', calendarRoutes);