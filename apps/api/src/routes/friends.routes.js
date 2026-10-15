// apps/api/src/routes/friends.routes.js
//
// Friends subsystem routes. Mounted at /api/friends.
//
// Every route requires an authenticated user. Access control is
// per-operation and enforced inside friends.service.js — e.g. only the
// recipient can accept a request, only the sender can cancel it.
//
// Rate limits:
//   - POST /requests: 20 per hour per user, to prevent spam.

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../lib/rateLimit.js';
import * as ctrl from '../controllers/friends.controller.js';

export const friendsRoutes = Router();

friendsRoutes.use(requireAuth);

const validate = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (e) { next(e); }
};

const sendRequestSchema = z
  .object({
    toUserId: z.string().min(1).max(64).optional(),
    email: z.string().trim().toLowerCase().email().max(320).optional(),
    message: z.string().trim().max(500).optional(),
  })
  .refine((d) => !!(d.toUserId || d.email), {
    message: 'Either toUserId or email is required',
  })
  .refine((d) => !(d.toUserId && d.email), {
    message: 'Provide either toUserId or email, not both',
  });

const blockSchema = z.object({
  userId: z.string().min(1).max(64),
  reason: z.string().trim().max(500).optional(),
});

const requestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many friend requests. Try again later.',
});

/* -------- Requests (specific paths first) -------- */

friendsRoutes.get('/requests', ctrl.listRequests);
friendsRoutes.post(
  '/requests',
  requestLimiter,
  validate(sendRequestSchema),
  ctrl.sendRequest
);
friendsRoutes.post('/requests/:id/accept',  ctrl.acceptRequest);
friendsRoutes.post('/requests/:id/decline', ctrl.declineRequest);
friendsRoutes.delete('/requests/:id',       ctrl.cancelRequest);

/* -------- Blocks -------- */

friendsRoutes.get('/blocks',            ctrl.listBlocks);
friendsRoutes.post('/blocks',           validate(blockSchema), ctrl.blockUser);
friendsRoutes.delete('/blocks/:userId', ctrl.unblockUser);

/* -------- Status -------- */

friendsRoutes.get('/status/:userId', ctrl.getStatus);

/* -------- Friends (root) — keep last: :friendId is a catch-all for
           single-segment DELETE, and specific paths must win. -------- */

friendsRoutes.get('/',            ctrl.listFriends);
friendsRoutes.delete('/:friendId', ctrl.removeFriend);