// apps/api/src/services/chat.service.js
//
// All chat business logic. Every read/write goes through assertParticipant()
// first — that is the ONLY access-control check for chat, and it is the
// guarantee that no admin route can ever see these conversations.
//
// Conversation types:
//   'dm'    — one-to-one direct message. `dmKey` is set. Peer lookup used.
//   'group' — multi-user group. `name`, `visibility`, etc. are set. Any
//             participant can read/write. Group creation is admin-only.
//
// SSE events emitted (all via broadcastToUser):
//   chat:message:new         { conversationId, message }                       -> all participants
//   chat:message:edited      { conversationId, messageId, body, editedAt }     -> all participants
//   chat:message:deleted     { conversationId, messageId, scope:'all' }        -> all participants
//   chat:message:delivered   { conversationId, messageId, deliveredAt }        -> all participants
//   chat:typing              { conversationId, userId, isTyping }              -> other participants
//   chat:read                { conversationId, readerUserId, lastReadMsgId, readAt } -> other participants
//
// Read receipts:
//   - markDelivered: called by the non-sender's device when it receives a
//     message via SSE. Sets Message.deliveredAt if null. Idempotent.
//   - markRead: called when the non-sender opens the thread. In one
//     transaction, bulk-marks every inbound message as delivered AND read,
//     then resets the participant's unreadCount and lastReadAt/Id.
//     Broadcasts chat:read to the other participant(s).

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { broadcastToUser } from '../lib/broadcaster.js';

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const PREVIEW_MAX = 120;
const MESSAGE_PAGE_DEFAULT = 50;
const MESSAGE_PAGE_MAX = 100;
const GROUP_DISCOVER_DEFAULT_LIMIT = 50;
const GROUP_DISCOVER_MAX_LIMIT = 100;

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
    deliveredAt: m.deliveredAt ?? null,
    readAt: m.readAt ?? null,
  };
}

/**
 * Unified serializer for both DM and group conversations.
 *
 * For DMs, `peer` is the other user and every group-metadata field is null.
 * For groups, `peer` is null and the metadata fields are populated.
 * `role` is the CALLER's role in this conversation — always 'member' for DMs.
 */
function serializeConversation(c, userId, participantRow) {
  const isGroup = c.type === 'group';

  const peer = !isGroup
    ? c.participants.find((p) => p.userId !== userId)?.user || null
    : null;

  return {
    id: c.id,
    type: c.type,
    isGroup,

    peer: serializePublicUser(peer),

    // Group metadata — all null for DMs.
    name: isGroup ? c.name : null,
    description: isGroup ? c.description : null,
    visibility: isGroup ? c.visibility : null,
    color: isGroup ? c.color : null,
    iconEmoji: isGroup ? c.iconEmoji : null,
    createdById: isGroup ? c.createdById : null,
    memberCount: isGroup ? c.memberCount : null,

    // Caller's role. 'member' for DMs by default.
    role: participantRow.role || 'member',

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

/**
 * Returns the caller's participant row for a conversation.
 * Throws 404 if the row is missing — never 403, to avoid leaking
 * conversation existence.
 *
 * The returned object includes `role`, which group-scoped callers use
 * to decide ownership / moderator actions.
 */
async function assertParticipant(userId, conversationId) {
  const row = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: {
      id: true,
      unreadCount: true,
      isPinned: true,
      isMuted: true,
      isArchived: true,
      role: true,
    },
  });
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
/*  DMs                                                                */
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

/* ------------------------------------------------------------------ */
/*  Conversations                                                      */
/* ------------------------------------------------------------------ */

export async function listConversations(userId) {
  const rows = await prisma.conversationParticipant.findMany({
    where: {
      userId,
      isArchived: false,
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
    NOT: { deletedForIds: { has: userId } },
  };

  if (before) {
    const cursor = new Date(before);
    if (!Number.isNaN(cursor.getTime())) {
      where.createdAt = { lt: cursor };
    }
  }

  const rows = await prisma.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: take + 1,
  });

  const hasMore = rows.length > take;
  const slice = hasMore ? rows.slice(0, take) : rows;
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

    await tx.conversationParticipant.updateMany({
      where: { conversationId, userId: { not: userId } },
      data: { unreadCount: { increment: 1 } },
    });

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

  if (scope === 'me') {
    await prisma.$executeRaw`
      UPDATE "messages"
      SET "deletedForIds" = array_append("deletedForIds", ${userId})
      WHERE "id" = ${messageId}
        AND NOT (${userId} = ANY("deletedForIds"))
    `;
    return { ok: true, scope: 'me' };
  }

  if (msg.senderId !== userId) {
    throw new HttpError(403, 'You can only delete your own messages for everyone');
  }
  if (msg.deletedAt) {
    return { ok: true, scope: 'all' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

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
/*  Delivery + Read receipts                                           */
/* ------------------------------------------------------------------ */

export async function markDelivered(userId, messageId) {
  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, conversationId: true, senderId: true, deliveredAt: true },
  });
  if (!msg) throw new HttpError(404, 'Message not found');

  await assertParticipant(userId, msg.conversationId);

  if (msg.senderId === userId) {
    return { ok: true, skipped: 'sender' };
  }
  if (msg.deliveredAt) {
    return { ok: true, alreadyDelivered: true };
  }

  const now = new Date();
  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { deliveredAt: now },
  });

  const participantIds = await getParticipantIds(msg.conversationId);
  const payload = {
    conversationId: msg.conversationId,
    messageId: msg.id,
    deliveredAt: now,
  };
  for (const pid of participantIds) {
    broadcastToUser(pid, 'chat:message:delivered', payload);
  }

  return { ok: true, deliveredAt: updated.deliveredAt };
}

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

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: {
        deliveredAt: now,
        readAt: now,
      },
    });

    await tx.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: {
        unreadCount: 0,
        lastReadAt: now,
        lastReadMsgId: last?.id || null,
      },
    });
  });

  const participantIds = await getParticipantIds(conversationId);
  const payload = {
    conversationId,
    readerUserId: userId,
    lastReadMsgId: last?.id || null,
    readAt: now,
  };
  for (const pid of participantIds) {
    if (pid === userId) continue;
    broadcastToUser(pid, 'chat:read', payload);
  }

  return { ok: true, readAt: now };
}

/* ------------------------------------------------------------------ */
/*  Typing                                                             */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Groups — user-facing surface                                       */
/*                                                                     */
/*  Group *creation* and full administration live under                */
/*  /api/admin/groups/* (see adminGroups.service.js). This file only   */
/*  handles the four actions a normal user can take:                   */
/*                                                                     */
/*    • browse public groups they aren't in                             */
/*    • self-join a public group                                        */
/*    • leave a group they belong to                                    */
/*    • list the members of a group they belong to                      */
/* ------------------------------------------------------------------ */

/**
 * List every PUBLIC group that `userId` is NOT already a member of.
 * Optionally filtered by name (`q`, case-insensitive, substring).
 * Ordered by memberCount desc, then createdAt desc — busiest groups first.
 */
export async function listDiscoverablePublicGroups(
  userId,
  { q = '', limit = GROUP_DISCOVER_DEFAULT_LIMIT } = {}
) {
  const memberships = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true },
  });
  const excludedIds = memberships.map((m) => m.conversationId);

  const where = {
    type: 'group',
    visibility: 'public',
    memberCount: { gt: 0 },
    id: { notIn: excludedIds },
  };

  const trimmed = String(q || '').trim();
  if (trimmed) {
    where.name = { contains: trimmed, mode: 'insensitive' };
  }

  const capped = Math.min(
    Math.max(1, Number(limit) || GROUP_DISCOVER_DEFAULT_LIMIT),
    GROUP_DISCOVER_MAX_LIMIT
  );

  const rows = await prisma.conversation.findMany({
    where,
    orderBy: [{ memberCount: 'desc' }, { createdAt: 'desc' }],
    take: capped,
    include: {
      createdBy: {
        select: {
          id: true, email: true, firstName: true, lastName: true, photoUrl: true,
        },
      },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    type: c.type,
    name: c.name,
    description: c.description,
    visibility: c.visibility,
    color: c.color,
    iconEmoji: c.iconEmoji,
    memberCount: c.memberCount,
    createdAt: c.createdAt,
    createdBy: serializePublicUser(c.createdBy),
  }));
}

/**
 * Self-join a PUBLIC group. Idempotent — if the caller is already a member,
 * returns the existing conversation unchanged.
 *
 * Refuses:
 *   • non-group conversation ids (404 — would otherwise leak DM existence)
 *   • private groups (403 — user must be added by an admin)
 */
export async function joinPublicGroup(userId, groupId) {
  const group = await prisma.conversation.findUnique({
    where: { id: groupId },
    select: { id: true, type: true, visibility: true },
  });
  if (!group || group.type !== 'group') {
    throw new HttpError(404, 'Group not found');
  }
  if (group.visibility !== 'public') {
    throw new HttpError(403, 'This group is private. Ask an admin to add you.');
  }

  const existing = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: groupId, userId } },
    select: { id: true },
  });

  if (!existing) {
    await prisma.$transaction(async (tx) => {
      await tx.conversationParticipant.create({
        data: { conversationId: groupId, userId, role: 'member' },
      });
      await tx.conversation.update({
        where: { id: groupId },
        data: { memberCount: { increment: 1 } },
      });
    });
  }

  const full = await prisma.conversation.findUnique({
    where: { id: groupId },
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

  const myRow = await assertParticipant(userId, groupId);
  return serializeConversation(full, userId, myRow);
}

/**
 * Leave a group. Idempotent — leaving a group you're not in succeeds.
 *
 * Refuses:
 *   • DMs (400 — DMs have no leave semantics)
 *   • the last owner leaving (400 — must transfer ownership first)
 */
export async function leaveGroup(userId, groupId) {
  const conv = await prisma.conversation.findUnique({
    where: { id: groupId },
    select: { id: true, type: true },
  });
  if (!conv) throw new HttpError(404, 'Conversation not found');
  if (conv.type === 'dm') {
    throw new HttpError(400, 'You cannot leave a direct message.');
  }
  if (conv.type !== 'group') {
    throw new HttpError(400, 'Not a group');
  }

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: groupId, userId } },
    select: { id: true, role: true },
  });

  if (!participant) {
    return { ok: true, alreadyLeft: true };
  }

  if (participant.role === 'owner') {
    const ownerCount = await prisma.conversationParticipant.count({
      where: { conversationId: groupId, role: 'owner' },
    });
    if (ownerCount <= 1) {
      throw new HttpError(
        400,
        'You are the group owner. Transfer ownership or delete the group before leaving.'
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.conversationParticipant.delete({
      where: { conversationId_userId: { conversationId: groupId, userId } },
    });
    const fresh = await tx.conversation.findUnique({
      where: { id: groupId },
      select: { memberCount: true },
    });
    if (fresh && fresh.memberCount > 0) {
      await tx.conversation.update({
        where: { id: groupId },
        data: { memberCount: { decrement: 1 } },
      });
    }
  });

  return { ok: true };
}

/**
 * List every member of a group the caller belongs to.
 * Ordered by role (owner → moderator → member), then join time ascending.
 */
export async function listGroupMembers(userId, groupId) {
  await assertParticipant(userId, groupId);

  const conv = await prisma.conversation.findUnique({
    where: { id: groupId },
    select: { type: true },
  });
  if (!conv || conv.type !== 'group') {
    throw new HttpError(404, 'Group not found');
  }

  const rows = await prisma.conversationParticipant.findMany({
    where: { conversationId: groupId },
    include: {
      user: {
        select: {
          id: true, email: true, firstName: true, lastName: true, photoUrl: true,
        },
      },
    },
  });

  const rank = { owner: 0, moderator: 1, member: 2 };
  rows.sort((a, b) => {
    const ra = rank[a.role] ?? 99;
    const rb = rank[b.role] ?? 99;
    if (ra !== rb) return ra - rb;
    return a.joinedAt.getTime() - b.joinedAt.getTime();
  });

  return rows.map((p) => ({
    id: p.id,
    userId: p.userId,
    role: p.role,
    joinedAt: p.joinedAt,
    user: serializePublicUser(p.user),
  }));
}