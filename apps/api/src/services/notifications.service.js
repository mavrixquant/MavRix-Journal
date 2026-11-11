// ============================================================================
// Notifications service.
//
// Two responsibilities:
//   1. push  — create a DB row + broadcast `notification:new` via SSE so
//              the recipient's client invalidates its notifications cache.
//   2. read  — list / mark-read / delete + unread-count queries.
//
// A notification is `common` (chats, friends, gex) or `broadcasts`
// (admin announcements, future changelogs).
// ============================================================================

import { prisma } from '../lib/prisma.js';
import { broadcastToUser } from '../lib/broadcaster.js';
import { HttpError } from '../middleware/error.js';

const serialize = (n) => ({
  id: n.id,
  type: n.type,
  section: n.section,
  title: n.title,
  body: n.body,
  data: n.data || {},
  readAt: n.readAt,
  createdAt: n.createdAt,
});

/**
 * Create one notification and broadcast it. Never throws — failures are
 * logged so caller-side message sends are never blocked by notif problems.
 */
export async function pushNotification(userId, { type, section = 'common', title, body = '', data = {} }) {
  if (!userId || !type || !title) return null;
  try {
    const row = await prisma.notification.create({
      data: { userId, type, section, title, body, data },
    });
    const serialized = serialize(row);
    broadcastToUser(userId, 'notification:new', serialized);
    return serialized;
  } catch (err) {
    console.error('[notifications] push failed:', err?.message || err);
    return null;
  }
}

/**
 * Create one notification per user in the list + broadcast to each.
 * Chunked at 500 rows per `createMany` call. Returns number inserted.
 */
export async function pushNotificationBulk(userIds, payload) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (ids.length === 0) return 0;

  const { type, section = 'common', title, body = '', data = {} } = payload;
  if (!type || !title) return 0;

  const CHUNK = 500;
  let inserted = 0;

  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    try {
      const res = await prisma.notification.createMany({
        data: chunk.map((userId) => ({ userId, type, section, title, body, data })),
      });
      inserted += res.count;

      // createMany doesn't return rows — broadcast a generic invalidation
      // payload so clients refetch the fresh rows with real IDs.
      const now = new Date().toISOString();
      for (const userId of chunk) {
        broadcastToUser(userId, 'notification:new', {
          type,
          section,
          title,
          body,
          data,
          createdAt: now,
          _bulk: true,
        });
      }
    } catch (err) {
      console.error('[notifications] bulk push failed:', err?.message || err);
    }
  }

  return inserted;
}

/* -------------------------------------------------------------------------- */
/* read-side                                                                  */
/* -------------------------------------------------------------------------- */

export async function listNotifications(userId, { section, unreadOnly, limit = 50 } = {}) {
  const where = { userId };
  if (section) where.section = section;
  if (unreadOnly) where.readAt = null;

  const take = Math.min(Math.max(1, Number(limit) || 50), 200);

  const rows = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
  });

  return rows.map(serialize);
}

export async function getUnreadCount(userId, { section } = {}) {
  const where = { userId, readAt: null };
  if (section) where.section = section;
  return prisma.notification.count({ where });
}

export async function markNotificationRead(userId, id) {
  const row = await prisma.notification.findFirst({ where: { id, userId } });
  if (!row) throw new HttpError(404, 'Notification not found');
  if (row.readAt) return serialize(row);

  const updated = await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
  return serialize(updated);
}

export async function markAllRead(userId, { section } = {}) {
  const where = { userId, readAt: null };
  if (section) where.section = section;

  const res = await prisma.notification.updateMany({
    where,
    data: { readAt: new Date() },
  });
  return { ok: true, updated: res.count };
}

export async function deleteNotification(userId, id) {
  const row = await prisma.notification.findFirst({ where: { id, userId } });
  if (!row) throw new HttpError(404, 'Notification not found');

  await prisma.notification.delete({ where: { id } });
  return { ok: true };
}

export async function clearRead(userId) {
  const res = await prisma.notification.deleteMany({
    where: { userId, readAt: { not: null } },
  });
  return { ok: true, deleted: res.count };
}

/* -------------------------------------------------------------------------- */
/* targeted mark-as-read helpers                                              */
/* -------------------------------------------------------------------------- */

/**
 * Clear every unread chat notification whose `data.conversationId` matches.
 * Called from chat.service.markRead so a user reading a thread also clears
 * the corresponding bell-badge entries.
 */
export async function markChatNotificationsReadByConversation(userId, conversationId) {
  if (!userId || !conversationId) return 0;
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        type: 'chat',
        readAt: null,
        data: { path: ['conversationId'], equals: conversationId },
      },
      data: { readAt: new Date() },
    });
    return result.count;
  } catch (err) {
    console.error('[notifications] mark-chat-by-conversation failed:', err?.message || err);
    return 0;
  }
}

/**
 * Clear every unread friend-request notification for a user. Called from
 * the /notifications/read-friends endpoint when they open the requests panel.
 */
export async function markFriendRequestNotificationsRead(userId) {
  if (!userId) return 0;
  try {
    const result = await prisma.notification.updateMany({
      where: { userId, type: 'friend_request', readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  } catch (err) {
    console.error('[notifications] mark-friend-requests failed:', err?.message || err);
    return 0;
  }
}

/**
 * Clear the friend_request notification coming from a specific sender.
 * Called from accept/decline so an actioned request disappears from the bell
 * without waiting for a manual read.
 */
export async function markFriendRequestNotificationFromSenderRead(userId, fromUserId) {
  if (!userId || !fromUserId) return 0;
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        type: 'friend_request',
        readAt: null,
        data: { path: ['fromUserId'], equals: fromUserId },
      },
      data: { readAt: new Date() },
    });
    return result.count;
  } catch (err) {
    console.error('[notifications] mark-friend-request-by-sender failed:', err?.message || err);
    return 0;
  }
}
