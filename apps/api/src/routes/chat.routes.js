// apps/api/src/routes/chat.routes.js
//
// Chat is FULLY private. Every route requires an authenticated user, and
// every service call re-verifies participant membership before touching the
// conversation. There is NO admin route that reads or moderates chat.
//
// Rate limits:
//   - send message: 30 / min / user
//   - typing:       120 / min / user (client throttles to ~1 per 2s)
//   - search:       30 / min / user

import { Router } from 'express';
import {
  sendMessageSchema,
  editMessageSchema,
  typingSchema,
  createDmSchema,
  userSearchSchema,
  updateConversationSchema,
} from '@mavrix/shared/validators';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../lib/rateLimit.js';
import * as ctrl from '../controllers/chat.controller.js';

export const chatRoutes = Router();

chatRoutes.use(requireAuth);

const validate = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (e) { next(e); }
};

const sendLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: 'Too many messages. Slow down.',
});

const typingLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  message: 'Too many typing events.',
});

const searchLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: 'Too many searches. Slow down.',
});

/* ---------------- Users ---------------- */

chatRoutes.get(
  '/users/search',
  searchLimiter,
  (req, _res, next) => {
    try {
      userSearchSchema.parse({ q: req.query.q });
      next();
    } catch (e) { next(e); }
  },
  ctrl.searchUsers
);

/* ---------------- Conversations ---------------- */

chatRoutes.get('/conversations', ctrl.listConversations);
chatRoutes.post('/conversations', validate(createDmSchema), ctrl.createConversation);
chatRoutes.get('/conversations/:id', ctrl.getConversation);
chatRoutes.patch(
  '/conversations/:id',
  validate(updateConversationSchema),
  ctrl.updateConversation
);

/* ---------------- Messages ---------------- */

chatRoutes.get('/conversations/:id/messages', ctrl.listMessages);
chatRoutes.post(
  '/conversations/:id/messages',
  sendLimiter,
  validate(sendMessageSchema),
  ctrl.sendMessage
);
chatRoutes.patch('/conversations/:id/read', ctrl.markRead);
chatRoutes.post(
  '/conversations/:id/typing',
  typingLimiter,
  validate(typingSchema),
  ctrl.typing
);

/* ---------------- Single message ---------------- */

chatRoutes.patch(
  '/messages/:messageId',
  validate(editMessageSchema),
  ctrl.editMessage
);
chatRoutes.delete('/messages/:messageId', ctrl.deleteMessage);