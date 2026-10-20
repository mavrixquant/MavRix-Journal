// ============================================================================
// Friends service.
//
// Mave AI's 3 personas (Guide, Trainer, Chat) are auto-friends — the user
// cannot remove or block them, and areFriends() returns true for all three.
// ----------------------------------------------------------------------------

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { broadcastToUser } from '../lib/broadcaster.js';
import {
  getAllMaveAiIds,
  getPersonaForAiId,
  isAnyMaveAiId,
} from './maveAiBootstrap.js';
import { MAVE_AI_PERSONAS } from '@mavrix/shared';

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
};

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

function serializeRequest(r) {
  if (!r) return null;
  return {
    id: r.id,
    fromUserId: r.fromUserId,
    toUserId: r.toUserId,
    message: r.message,
    status: r.status,
    createdAt: r.createdAt,
    respondedAt: r.respondedAt,
    fromUser: r.fromUser ? serializePublicUser(r.fromUser) : null,
    toUser: r.toUser ? serializePublicUser(r.toUser) : null,
  };
}

function canonicalPair(a, b) {
  return a < b ? [a, b] : [b, a];
}

function dmKeyFor(a, b) {
  return [a, b].sort().join(':');
}

export async function areFriends(a, b) {
  if (!a || !b || a === b) return false;
  if (isAnyMaveAiId(a) || isAnyMaveAiId(b)) return true;
  const [userAId, userBId] = canonicalPair(a, b);
  const row = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { id: true },
  });
  return !!row;
}

export async function isBlockedEither(a, b) {
  if (!a || !b || a === b) return false;
  if (isAnyMaveAiId(a) || isAnyMaveAiId(b)) return false;
  const row = await prisma.userBlock.findFirst({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
    select: { id: true },
  });
  return !!row;
}

export async function getBlockedUserIds(userId) {
  const rows = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const set = new Set();
  for (const r of rows) set.add(r.blockerId === userId ? r.blockedId : r.blockerId);
  return [...set];
}

export async function listFriends(userId) {
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: { userA: { select: PUBLIC_USER_SELECT }, userB: { select: PUBLIC_USER_SELECT } },
    orderBy: { createdAt: 'desc' },
  });

  const blocked = new Set(await getBlockedUserIds(userId));
  const visibleRows = rows.map((f) => {
    const peer = f.userAId === userId ? f.userB : f.userA;
    if (!peer || blocked.has(peer.id)) return null;
    return { friendship: f, peer };
  }).filter(Boolean);

  const peerIds = visibleRows.map((r) => r.peer.id);
  const dmMap = new Map();

  if (peerIds.length > 0) {
    const dmKeys = peerIds.map((pid) => dmKeyFor(userId, pid));
    const conversations = await prisma.conversation.findMany({
      where: { dmKey: { in: dmKeys } },
      select: {
        id: true,
        dmKey: true,
        participants: { where: { userId }, select: { isArchived: true } },
      },
    });

    const peerByKey = new Map();
    for (const pid of peerIds) peerByKey.set(dmKeyFor(userId, pid), pid);
    for (const c of conversations) {
      const pid = peerByKey.get(c.dmKey);
      if (!pid) continue;
      dmMap.set(pid, { conversationId: c.id, isArchived: c.participants[0]?.isArchived ?? false });
    }
  }

  const normalFriends = visibleRows.map(({ friendship, peer }) => {
    const dm = dmMap.get(peer.id);
    return {
      ...serializePublicUser(peer),
      isAi: false,
      aiPersona: null,
      friendshipId: friendship.id,
      friendsSince: friendship.createdAt,
      conversationId: dm?.conversationId ?? null,
      isArchived: dm?.isArchived ?? false,
    };
  });

  // Mave AI personas — prepended, one entry per persona
  const aiIds = getAllMaveAiIds();
  if (aiIds.length > 0) {
    const aiUsers = await prisma.user.findMany({
      where: { id: { in: aiIds } },
      select: PUBLIC_USER_SELECT,
    });

    const aiDmKeys = aiUsers.map((u) => dmKeyFor(userId, u.id));
    const aiConvs = await prisma.conversation.findMany({
      where: { dmKey: { in: aiDmKeys } },
      select: {
        id: true,
        dmKey: true,
        participants: { where: { userId }, select: { isArchived: true } },
      },
    });

    const aiDmByKey = new Map();
    for (const c of aiConvs) {
      aiDmByKey.set(c.dmKey, {
        conversationId: c.id,
        isArchived: c.participants[0]?.isArchived ?? false,
      });
    }

    // Preserve persona order (Guide → Trainer → Chat)
    const aiFriends = MAVE_AI_PERSONAS
      .map((meta) => {
        const u = aiUsers.find((x) => getPersonaForAiId(x.id) === meta.id);
        if (!u) return null;
        const dm = aiDmByKey.get(dmKeyFor(userId, u.id));
        return {
          ...serializePublicUser(u),
          isAi: true,
          aiPersona: meta.id,
          friendshipId: `mave-ai-${meta.id}`,
          friendsSince: new Date().toISOString(),
          conversationId: dm?.conversationId ?? null,
          isArchived: dm?.isArchived ?? false,
        };
      })
      .filter(Boolean);

    normalFriends.unshift(...aiFriends);
  }

  return normalFriends;
}

export async function listIncomingRequests(userId) {
  const rows = await prisma.friendRequest.findMany({
    where: { toUserId: userId, status: 'pending' },
    include: { fromUser: { select: PUBLIC_USER_SELECT } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeRequest);
}

export async function listOutgoingRequests(userId) {
  const rows = await prisma.friendRequest.findMany({
    where: { fromUserId: userId, status: 'pending' },
    include: { toUser: { select: PUBLIC_USER_SELECT } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeRequest);
}

export async function listBlocks(userId) {
  const rows = await prisma.userBlock.findMany({
    where: { blockerId: userId },
    include: { blocked: { select: PUBLIC_USER_SELECT } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((b) => ({
    id: b.id,
    reason: b.reason,
    createdAt: b.createdAt,
    user: serializePublicUser(b.blocked),
  }));
}

export async function getFriendStatusBatch(userId, otherIds) {
  const unique = [...new Set((otherIds || []).filter((id) => id && id !== userId))];
  if (unique.length === 0) return {};

  const [friendships, requests, blocks] = await Promise.all([
    prisma.friendship.findMany({
      where: {
        OR: [
          { userAId: userId, userBId: { in: unique } },
          { userBId: userId, userAId: { in: unique } },
        ],
      },
      select: { userAId: true, userBId: true },
    }),
    prisma.friendRequest.findMany({
      where: {
        status: 'pending',
        OR: [
          { fromUserId: userId, toUserId: { in: unique } },
          { toUserId: userId, fromUserId: { in: unique } },
        ],
      },
      select: { fromUserId: true, toUserId: true },
    }),
    prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerId: userId, blockedId: { in: unique } },
          { blockedId: userId, blockerId: { in: unique } },
        ],
      },
      select: { blockerId: true, blockedId: true },
    }),
  ]);

  const friendSet = new Set();
  for (const f of friendships) {
    friendSet.add(f.userAId === userId ? f.userBId : f.userAId);
  }

  const outgoing = new Set();
  const incoming = new Set();
  for (const r of requests) {
    if (r.fromUserId === userId) outgoing.add(r.toUserId);
    else incoming.add(r.fromUserId);
  }

  const blockedByMe = new Set();
  const blockedMe = new Set();
  for (const b of blocks) {
    if (b.blockerId === userId) blockedByMe.add(b.blockedId);
    else blockedMe.add(b.blockerId);
  }

  const out = {};
  for (const id of unique) {
    const bm = blockedByMe.has(id);
    const bme = blockedMe.has(id);
    const isAi = isAnyMaveAiId(id);
    out[id] = {
      isFriend: isAi || friendSet.has(id),
      hasOutgoingRequest: outgoing.has(id),
      hasIncomingRequest: incoming.has(id),
      blockedByMe: bm,
      blockedMe: bme,
      isBlocked: bm || bme,
    };
  }
  return out;
}

export async function getFriendStatus(userId, otherId) {
  if (!otherId) throw new HttpError(400, 'userId is required');
  const batch = await getFriendStatusBatch(userId, [otherId]);
  return (
    batch[otherId] || {
      isFriend: false,
      hasOutgoingRequest: false,
      hasIncomingRequest: false,
      blockedByMe: false,
      blockedMe: false,
      isBlocked: false,
    }
  );
}

export async function sendFriendRequest(userId, { toUserId, email, message }) {
  let targetId = toUserId || null;
  if (!targetId && email) {
    const byEmail = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      select: { id: true },
    });
    if (!byEmail) throw new HttpError(404, 'No user found with that email address');
    targetId = byEmail.id;
  }
  if (!targetId) throw new HttpError(400, 'toUserId or email is required');
  if (targetId === userId) throw new HttpError(400, 'You cannot send a friend request to yourself');

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, isBanned: true, emailVerified: true, isAi: true },
  });
  if (!target || target.isBanned || target.isAi) throw new HttpError(404, 'User not found');
  if (!target.emailVerified) throw new HttpError(403, 'This user has not verified their email yet');

  if (await isBlockedEither(userId, targetId)) {
    throw new HttpError(403, 'Cannot send a friend request to this user');
  }
  if (await areFriends(userId, targetId)) {
    throw new HttpError(409, 'You are already friends');
  }

  const reverse = await prisma.friendRequest.findFirst({
    where: { fromUserId: targetId, toUserId: userId, status: 'pending' },
    select: { id: true },
  });
  if (reverse) return acceptFriendRequest(userId, reverse.id);

  const same = await prisma.friendRequest.findFirst({
    where: { fromUserId: userId, toUserId: targetId, status: 'pending' },
    select: { id: true },
  });
  if (same) throw new HttpError(409, 'You already have a pending request to this user');

  const created = await prisma.friendRequest.create({
    data: {
      fromUserId: userId,
      toUserId: targetId,
      message: message ? String(message).trim().slice(0, 500) : null,
    },
    include: { fromUser: { select: PUBLIC_USER_SELECT } },
  });

  const serialized = serializeRequest(created);
  broadcastToUser(targetId, 'friend:request:new', { request: serialized });
  return serialized;
}

export async function acceptFriendRequest(userId, requestId) {
  const result = await prisma.$transaction(async (tx) => {
    const req = await tx.friendRequest.findUnique({
      where: { id: requestId },
      include: {
        fromUser: { select: PUBLIC_USER_SELECT },
        toUser: { select: PUBLIC_USER_SELECT },
      },
    });
    if (!req) throw new HttpError(404, 'Friend request not found');
    if (req.toUserId !== userId) throw new HttpError(403, 'This request is not addressed to you');
    if (req.status !== 'pending') throw new HttpError(400, `Request is already ${req.status}`);

    const updated = await tx.friendRequest.update({
      where: { id: requestId },
      data: { status: 'accepted', respondedAt: new Date() },
      include: {
        fromUser: { select: PUBLIC_USER_SELECT },
        toUser: { select: PUBLIC_USER_SELECT },
      },
    });

    const [userAId, userBId] = canonicalPair(req.fromUserId, req.toUserId);
    await tx.friendship.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId },
      update: {},
    });
    return updated;
  });

  const serialized = serializeRequest(result);
  const accepter = serializePublicUser(result.toUser);
  const requester = serializePublicUser(result.fromUser);

  broadcastToUser(result.fromUserId, 'friend:request:accepted', {
    peer: accepter,
    request: serialized,
  });
  broadcastToUser(result.toUserId, 'friend:request:accepted', {
    peer: requester,
    request: serialized,
  });
  return serialized;
}

export async function declineFriendRequest(userId, requestId) {
  const req = await prisma.friendRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new HttpError(404, 'Friend request not found');
  if (req.toUserId !== userId) throw new HttpError(403, 'This request is not addressed to you');
  if (req.status !== 'pending') throw new HttpError(400, `Request is already ${req.status}`);

  await prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: 'declined', respondedAt: new Date() },
  });
  broadcastToUser(req.fromUserId, 'friend:request:declined', { requestId: req.id });
  return { ok: true };
}

export async function cancelFriendRequest(userId, requestId) {
  const req = await prisma.friendRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new HttpError(404, 'Friend request not found');
  if (req.fromUserId !== userId) throw new HttpError(403, 'You can only cancel requests you sent');
  if (req.status !== 'pending') throw new HttpError(400, `Request is already ${req.status}`);

  await prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: 'cancelled', respondedAt: new Date() },
  });
  broadcastToUser(req.toUserId, 'friend:request:cancelled', { requestId: req.id });
  return { ok: true };
}

export async function removeFriend(userId, friendId) {
  if (!friendId) throw new HttpError(400, 'friendId is required');
  if (friendId === userId) throw new HttpError(400, 'Cannot remove yourself');

  if (isAnyMaveAiId(friendId)) {
    throw new HttpError(403, 'Mave AI cannot be removed from your friends list.');
  }

  const [userAId, userBId] = canonicalPair(userId, friendId);
  const existing = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  if (!existing) throw new HttpError(404, 'You are not friends with this user');

  await prisma.friendship.delete({
    where: { userAId_userBId: { userAId, userBId } },
  });
  broadcastToUser(friendId, 'friend:removed', { peerId: userId });
  broadcastToUser(userId, 'friend:removed', { peerId: friendId });
  return { ok: true };
}

export async function blockUser(userId, targetId, reason) {
  if (!targetId) throw new HttpError(400, 'userId is required');
  if (targetId === userId) throw new HttpError(400, 'Cannot block yourself');

  if (isAnyMaveAiId(targetId)) {
    throw new HttpError(403, 'Mave AI cannot be blocked.');
  }

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) throw new HttpError(404, 'User not found');

  const [userAId, userBId] = canonicalPair(userId, targetId);
  const reasonClean = reason ? String(reason).trim().slice(0, 500) : null;

  await prisma.$transaction(async (tx) => {
    await tx.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
      create: { blockerId: userId, blockedId: targetId, reason: reasonClean },
      update: { reason: reasonClean },
    });
    await tx.friendship.deleteMany({ where: { userAId, userBId } });
    await tx.friendRequest.updateMany({
      where: {
        status: 'pending',
        OR: [
          { fromUserId: userId, toUserId: targetId },
          { fromUserId: targetId, toUserId: userId },
        ],
      },
      data: { status: 'cancelled', respondedAt: new Date() },
    });
  });

  broadcastToUser(targetId, 'block:new', { blockerId: userId });
  broadcastToUser(userId, 'block:new', { blockedId: targetId });
  return { ok: true };
}

export async function unblockUser(userId, targetId) {
  if (!targetId) throw new HttpError(400, 'userId is required');
  const existing = await prisma.userBlock.findUnique({
    where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
  });
  if (!existing) return { ok: true, alreadyUnblocked: true };

  await prisma.userBlock.delete({
    where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
  });
  broadcastToUser(targetId, 'block:removed', { blockerId: userId });
  broadcastToUser(userId, 'block:removed', { blockedId: targetId });
  return { ok: true };
}