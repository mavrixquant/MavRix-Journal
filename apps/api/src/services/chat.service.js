// apps/api/src/services/chat.service.js
//
// All chat business logic. Every read/write goes through assertParticipant()
// first — that is the ONLY access-control check for chat, and it is the
// guarantee that no admin route can ever see these conversations.
//
// SSE events emitted (all via broadcastToUser):
//   chat:message:new     { conversationId, message }              → all participants
//   chat:message:edited  { conversationId, messageId, body, editedAt } → all participants
//   chat:message:deleted { conversationId, messageId, scope:'all' } → all participants
//   chat:typing          { conversationId, userId, isTyping }     → other participants
//
// Read receipts are intentionally NOT broadcast in this build. The DB columns
// (lastReadAt / lastReadMsgId / unreadCount) are kept in sync silently so the
// self-side unread badge works. Broadcasting them is a one-event add-on.

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { broadcastToUser } from '../lib/broadcaster.js';

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const PREVIEW_MAX = 120;
const MESSAGE_PAGE_DEFAULT = 50;
const MESSAGE_PAGE_MAX = 100;

/* ------------------------------------------------------------------ */
/*  Serializers                                                        */
/* ------------------------------------------------------------------ */

function serializePublicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    photoUrl: u.photoUrl,
  };
}

function serializeMessage(m) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    body: m.deletedAt ? null : m.body,
    replyToId: m.replyToId,
    createdAt: m.createdAt,
    editedAt: m.editedAt,
    deletedAt: m.deletedAt,
    deleted: !!m.deletedAt,
  };
}

function serializeConversation(c, userId, participantRow) {
  const peer =
    c.type === 'dm'
      ? c.participants.find((p) => p.userId !== userId)?.user || null
      : null;

  return {
    id: c.id,
    type: c.type,
    peer: serializePublicUser(peer),
    lastMessageAt: c.lastMessageAt,
    lastMessageText: c.lastMessageText,
    lastMessageById: c.lastMessageById,
    unreadCount: participantRow.unreadCount,
    isPinned: participantRow.isPinned,
    isMuted: participantRow.isMuted,
    isArchived: participantRow.isArchived,
    createdAt: c.createdAt,
  };
}

/* ------------------------------------------------------------------ */
/*  Guards                                                             */
/* ------------------------------------------------------------------ */

async function assertParticipant(userId, conversationId) {
  const row = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: {
      id: true,
      unreadCount: true,
      isPinned: true,
      isMuted: true,
      isArchived: true,
    },
  });
  // 404 (not 403) to avoid leaking conversation existence.
  if (!row) throw new HttpError(404, 'Conversation not found');
  return row;
}

async function getParticipantIds(conversationId) {
  const rows = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

/* ------------------------------------------------------------------ */
/*  User search                                                        */
/* ------------------------------------------------------------------ */

export async function searchUsers(userId, q) {
  const query = String(q || '').trim();
  if (query.length < 2) return [];

  // If the query contains "@", treat it as an email PREFIX match to
  // prevent full-directory enumeration (a bare "a" should not dump the
  // entire user table). Names still use a CONTAINS match for UX.
  const isEmailQuery = query.includes('@');

  const where = isEmailQuery
    ? {
        id: { not: userId },
        isBanned: false,
        emailVerified: true,
        email: { startsWith: query, mode: 'insensitive' },
      }
    : {
        id: { not: userId },
        isBanned: false,
        emailVerified: true,
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
        ],
      };

  const rows = await prisma.user.findMany({
    where,
    take: 20,
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
    },
  });
  return rows.map(serializePublicUser);
}

/* ------------------------------------------------------------------ */
/*  Conversations                                                      */
/* ------------------------------------------------------------------ */

function dmKeyFor(a, b) {
  return [a, b].sort().join(':');
}

export async function getOrCreateDm(userId, peerId) {
  if (!peerId || peerId === userId) {
    throw new HttpError(400, 'Invalid peer');
  }

  const peer = await prisma.user.findUnique({
    where: { id: peerId },
    select: { id: true, isBanned: true, emailVerified: true },
  });
  if (!peer || peer.isBanned) throw new HttpError(404, 'User not found');
  if (!peer.emailVerified) {
    throw new HttpError(403, 'This user has not verified their email');
  }

  const key = dmKeyFor(userId, peerId);

  // ---- Fast path: existing DM ----
  const existing = await prisma.conversation.findUnique({
    where: { dmKey: key },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true, email: true, firstName: true, lastName: true, photoUrl: true,
            },
          },
        },
      },
    },
  });

  if (existing) {
    const myRow = await assertParticipant(userId, existing.id);
    return serializeConversation(existing, userId, myRow);
  }

  // ---- Create new DM ----
  const created = await prisma.conversation.create({
    data: {
      type: 'dm',
      dmKey: key,
      participants: {
        create: [{ userId }, { userId: peerId }],
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true, email: true, firstName: true, lastName: true, photoUrl: true,
            },
          },
        },
      },
    },
  });

  const myRow = await assertParticipant(userId, created.id);
  return serializeConversation(created, userId, myRow);
}

/**
 * List the current user's conversations.
 *
 * Only conversations with at least one message are shown in the sidebar.
 * This means: opening a new DM and sending nothing does NOT surface the
 * thread on the peer's list. The moment the first message is sent, it
 * appears everywhere live via the `chat:message:new` broadcast.
 */
export async function listConversations(userId) {
  const rows = await prisma.conversationParticipant.findMany({
    where: {
      userId,
      isArchived: false,
      conversation: { messages: { some: {} } },
    },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true, email: true, firstName: true, lastName: true, photoUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Pinned first, then most recent activity.
  rows.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const at = a.conversation.lastMessageAt?.getTime() || 0;
    const bt = b.conversation.lastMessageAt?.getTime() || 0;
    return bt - at;
  });

  return rows.map((p) => serializeConversation(p.conversation, userId, p));
}

export async function getConversation(userId, conversationId) {
  const myRow = await assertParticipant(userId, conversationId);

  const c = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true, email: true, firstName: true, lastName: true, photoUrl: true,
            },
          },
        },
      },
    },
  });
  if (!c) throw new HttpError(404, 'Conversation not found');
  return serializeConversation(c, userId, myRow);
}

export async function updateConversation(userId, conversationId, patch) {
  await assertParticipant(userId, conversationId);

  const data = {};
  if (typeof patch.isPinned === 'boolean') data.isPinned = patch.isPinned;
  if (typeof patch.isMuted === 'boolean') data.isMuted = patch.isMuted;
  if (typeof patch.isArchived === 'boolean') data.isArchived = patch.isArchived;
  if (Object.keys(data).length === 0) return { ok: true };

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data,
  });
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Messages                                                           */
/* ------------------------------------------------------------------ */

export async function listMessages(userId, conversationId, { before, limit } = {}) {
  await assertParticipant(userId, conversationId);

  const take = Math.min(
    Math.max(1, Number(limit) || MESSAGE_PAGE_DEFAULT),
    MESSAGE_PAGE_MAX
  );

  const where = {
    conversationId,
    // "delete for me" — the requesting user does not see messages they hid.
    NOT: { deletedForIds: { has: userId } },
  };

  if (before) {
    const cursor = new Date(before);
    if (!Number.isNaN(cursor.getTime())) {
      where.createdAt = { lt: cursor };
    }
  }

  // Fetch take+1 to know if a further page exists.
  const rows = await prisma.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: take + 1,
  });

  const hasMore = rows.length > take;
  const slice = hasMore ? rows.slice(0, take) : rows;
  // Payload is ascending (oldest → newest) for direct prepend into the UI.
  const messages = slice.map(serializeMessage).reverse();

  return {
    messages,
    hasMore,
    nextCursor: hasMore ? slice[slice.length - 1].createdAt : null,
  };
}

export async function sendMessage(userId, conversationId, { body, replyToId }) {
  await assertParticipant(userId, conversationId);

  const trimmed = String(body || '').trim();
  if (!trimmed) throw new HttpError(400, 'Message body is required');
  if (trimmed.length > 4000) throw new HttpError(400, 'Message too long');

  if (replyToId) {
    const parent = await prisma.message.findUnique({
      where: { id: replyToId },
      select: { id: true, conversationId: true },
    });
    if (!parent || parent.conversationId !== conversationId) {
      throw new HttpError(400, 'Invalid reply target');
    }
  }

  const { message, participantIds } = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId,
        senderId: userId,
        body: trimmed,
        replyToId: replyToId || null,
      },
    });

    const now = new Date();

    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: now,
        lastMessageText: trimmed.slice(0, PREVIEW_MAX),
        lastMessageById: userId,
      },
    });

    // Bump unread for every participant EXCEPT the sender.
    await tx.conversationParticipant.updateMany({
      where: { conversationId, userId: { not: userId } },
      data: { unreadCount: { increment: 1 } },
    });

    // Sender's own read pointer moves forward.
    await tx.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: now, lastReadMsgId: created.id },
    });

    const rows = await tx.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });

    return { message: created, participantIds: rows.map((r) => r.userId) };
  });

  const payload = { conversationId, message: serializeMessage(message) };
  for (const pid of participantIds) {
    broadcastToUser(pid, 'chat:message:new', payload);
  }

  return serializeMessage(message);
}

export async function editMessage(userId, messageId, { body }) {
  const trimmed = String(body || '').trim();
  if (!trimmed) throw new HttpError(400, 'Message body is required');
  if (trimmed.length > 4000) throw new HttpError(400, 'Message too long');

  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg) throw new HttpError(404, 'Message not found');

  if (msg.senderId !== userId) {
    throw new HttpError(403, 'You can only edit your own messages');
  }
  if (msg.deletedAt) {
    throw new HttpError(400, 'Cannot edit a deleted message');
  }
  if (Date.now() - msg.createdAt.getTime() > EDIT_WINDOW_MS) {
    throw new HttpError(403, 'Messages can only be edited within 15 minutes');
  }

  await assertParticipant(userId, msg.conversationId);

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.message.update({
      where: { id: messageId },
      data: { body: trimmed, editedAt: new Date() },
    });

    // If this was the last surviving message, refresh the preview text.
    const convo = await tx.conversation.findUnique({
      where: { id: row.conversationId },
      select: { lastMessageAt: true },
    });
    if (convo?.lastMessageAt?.getTime() === row.createdAt.getTime()) {
      await tx.conversation.update({
        where: { id: row.conversationId },
        data: { lastMessageText: trimmed.slice(0, PREVIEW_MAX) },
      });
    }
    return row;
  });

  const participantIds = await getParticipantIds(updated.conversationId);
  const payload = {
    conversationId: updated.conversationId,
    messageId: updated.id,
    body: updated.body,
    editedAt: updated.editedAt,
  };
  for (const pid of participantIds) {
    broadcastToUser(pid, 'chat:message:edited', payload);
  }

  return serializeMessage(updated);
}

export async function deleteMessage(userId, messageId, scope) {
  if (scope !== 'me' && scope !== 'all') {
    throw new HttpError(400, 'scope must be "me" or "all"');
  }

  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg) throw new HttpError(404, 'Message not found');

  await assertParticipant(userId, msg.conversationId);

  // ---- delete for me ----
  if (scope === 'me') {
    // Append userId to deletedForIds only if not already present.
    await prisma.$executeRaw`
      UPDATE "messages"
      SET "deletedForIds" = array_append("deletedForIds", ${userId})
      WHERE "id" = ${messageId}
        AND NOT (${userId} = ANY("deletedForIds"))
    `;
    // No broadcast — this is a purely local action.
    return { ok: true, scope: 'me' };
  }

  // ---- delete for everyone ----
  if (msg.senderId !== userId) {
    throw new HttpError(403, 'You can only delete your own messages for everyone');
  }
  if (msg.deletedAt) {
    return { ok: true, scope: 'all' }; // idempotent
  }

  await prisma.$transaction(async (tx) => {
    await tx.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    // Recompute the conversation preview from the last non-deleted message.
    const last = await tx.message.findFirst({
      where: { conversationId: msg.conversationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, senderId: true, body: true, createdAt: true },
    });

    if (last) {
      await tx.conversation.update({
        where: { id: msg.conversationId },
        data: {
          lastMessageAt: last.createdAt,
          lastMessageText: last.body.slice(0, PREVIEW_MAX),
          lastMessageById: last.senderId,
        },
      });
    } else {
      await tx.conversation.update({
        where: { id: msg.conversationId },
        data: { lastMessageText: null, lastMessageById: null },
      });
    }
  });

  const participantIds = await getParticipantIds(msg.conversationId);
  const payload = {
    conversationId: msg.conversationId,
    messageId: msg.id,
    scope: 'all',
  };
  for (const pid of participantIds) {
    broadcastToUser(pid, 'chat:message:deleted', payload);
  }

  return { ok: true, scope: 'all' };
}

/* ------------------------------------------------------------------ */
/*  Read / Typing                                                      */
/* ------------------------------------------------------------------ */

export async function markRead(userId, conversationId) {
  await assertParticipant(userId, conversationId);

  const last = await prisma.message.findFirst({
    where: {
      conversationId,
      deletedAt: null,
      NOT: { deletedForIds: { has: userId } },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: {
      unreadCount: 0,
      lastReadAt: new Date(),
      lastReadMsgId: last?.id || null,
    },
  });

  // NOTE: read receipts are intentionally NOT broadcast in this build.
  // The DB stays in sync so the UI can show the self-side unread badge.
  // Broadcasting is a one-event add-on later.
  return { ok: true };
}

export async function broadcastTyping(userId, conversationId, isTyping) {
  await assertParticipant(userId, conversationId);

  const ids = await getParticipantIds(conversationId);
  for (const pid of ids) {
    if (pid === userId) continue;
    broadcastToUser(pid, 'chat:typing', {
      conversationId,
      userId,
      isTyping: !!isTyping,
    });
  }
  return { ok: true };
}