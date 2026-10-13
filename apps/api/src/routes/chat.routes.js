// apps/api/src/routes/chat.routes.js
//
// Chat is FULLY private. Every route requires an authenticated user, and
// every service call re-verifies participant membership before touching the
// conversation. There is NO admin route that reads or moderates chat.
//
// Group discovery, join, leave, and member-list are the ONLY group
// operations a normal user can perform. Group *creation* and full
// administration live under /api/admin/groups/*.
//
// Rate limits:
//   - send message: 30 / min / user
//   - typing:       120 / min / user (client throttles to ~1 per 2s)
//   - search:       30 / min / user
//   - delivered:    600 / min / user (one per inbound message, high ceiling)
//   - group actions: 30 / min / user (discovery, join, leave, member-list)

import { Router } from 'express';
import {
  sendMessageSchema,
  editMessageSchema,
  typingSchema,
  createDmSchema,
  userSearchSchema,
  updateConversationSchema,
  groupDiscoverQuerySchema,
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

const deliveredLimiter = rateLimit({
  windowMs: 60_000,
  max: 600,
  message: 'Too many delivery acks.',
});

const groupActionLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: 'Too many group actions. Slow down.',
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

/* ---------------- Groups (user surface) ---------------- */
//
// Mount order matters: static "/groups/discover" must come before any
// "/groups/:id/*" pattern so Express doesn't try to parse "discover" as
// an id.

chatRoutes.get(
  '/groups/discover',
  groupActionLimiter,
  (req, _res, next) => {
    try {
      groupDiscoverQuerySchema.parse({
        q: req.query.q,
        limit: req.query.limit,
      });
      next();
    } catch (e) { next(e); }
  },
  ctrl.discoverGroups
);

chatRoutes.post('/groups/:id/join',   groupActionLimiter, ctrl.joinGroup);
chatRoutes.post('/groups/:id/leave',  groupActionLimiter, ctrl.leaveGroup);
chatRoutes.get( '/groups/:id/members', groupActionLimiter, ctrl.listGroupMembers);

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

chatRoutes.post(
  '/messages/:messageId/delivered',
  deliveredLimiter,
  ctrl.markDelivered
);
chatRoutes.patch(
  '/messages/:messageId',
  validate(editMessageSchema),
  ctrl.editMessage
);
chatRoutes.delete('/messages/:messageId', ctrl.deleteMessage);