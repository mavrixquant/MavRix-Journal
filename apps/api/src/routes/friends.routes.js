
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
    username: z.string().trim().toLowerCase().min(3).max(30).optional(),
    message: z.string().trim().max(500).optional(),
  })
  .refine((d) => !!(d.toUserId || d.username), {
    message: 'Either toUserId or username is required',
  })
  .refine((d) => !(d.toUserId && d.username), {
    message: 'Provide either toUserId or username, not both',
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


friendsRoutes.get('/blocks',            ctrl.listBlocks);
friendsRoutes.post('/blocks',           validate(blockSchema), ctrl.blockUser);
friendsRoutes.delete('/blocks/:userId', ctrl.unblockUser);


friendsRoutes.get('/status/:userId', ctrl.getStatus);


friendsRoutes.get('/',            ctrl.listFriends);
friendsRoutes.delete('/:friendId', ctrl.removeFriend);