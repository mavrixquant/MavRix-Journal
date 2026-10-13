// apps/api/src/services/adminGroups.service.js
//
// Cross-cutting group administration. Sits behind the admin panel — this is
// the ONLY place group creation and full group management is exposed.
//
// Permission model (enforced by assertGroupAdminPermission):
//
//   admin      — can see + manage PUBLIC groups
//              — can see + manage PRIVATE groups they created
//              — cannot see PRIVATE groups they don't own
//
//   superadmin — can see + manage EVERY group, public or private
//
// Every mutation writes an AdminAuditLog row (group.create, group.update,
// group.delete, group.member.add, group.member.remove, group.member.role).
//
// Groups are stored in the same Conversation/Message tables as DMs. The
// only difference is `type = 'group'` and the extra metadata columns.

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../lib/audit.js';
import { broadcastToUser } from '../lib/broadcaster.js';

const PAGE_DEFAULT = 25;
const PAGE_MAX = 100;

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

const serializeGroupListItem = (c) => ({
  id: c.id,
  type: c.type,
  name: c.name,
  description: c.description,
  visibility: c.visibility,
  color: c.color,
  iconEmoji: c.iconEmoji,
  memberCount: c.memberCount,
  createdById: c.createdById,
  createdBy: serializePublicUser(c.createdBy),
  lastMessageAt: c.lastMessageAt,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

const serializeGroupDetail = (c) => ({
  ...serializeGroupListItem(c),
  lastMessageText: c.lastMessageText,
  lastMessageById: c.lastMessageById,
  members: (c.participants || []).map((p) => ({
    id: p.id,
    userId: p.userId,
    role: p.role,
    joinedAt: p.joinedAt,
    user: serializePublicUser(p.user),
  })),
});

/* ------------------------------------------------------------------ */
/*  Permission guard                                                   */
/* ------------------------------------------------------------------ */

/**
 * Fetches a group and asserts the actor has admin-level access to it.
 *
 * Returns the full conversation (with participants + creator) so callers
 * don't need a second round-trip.
 *
 * Throws:
 *   404 — group id doesn't exist or isn't a group (DMs are invisible here)
 *   403 — admin tries to touch a private group they don't own
 */
async function assertGroupAdminPermission(actor, groupId) {
  const group = await prisma.conversation.findUnique({
    where: { id: groupId },
    include: {
      createdBy: {
        select: {
          id: true, email: true, firstName: true, lastName: true, photoUrl: true,
        },
      },
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

  if (!group || group.type !== 'group') {
    throw new HttpError(404, 'Group not found');
  }

  if (actor.role === 'superadmin') return group;

  const isPublic = group.visibility === 'public';
  const isOwner = group.createdById === actor.id;

  if (isPublic || isOwner) return group;

  throw new HttpError(
    403,
    'You do not have permission to manage this group.'
  );
}

/* ------------------------------------------------------------------ */
/*  List                                                               */
/* ------------------------------------------------------------------ */

/**
 * Paginated list of groups visible to the actor.
 *
 * Filters:
 *   q            — substring on `name`
 *   visibility   — 'public' | 'private'
 *   createdById  — filter by owner
 *
 * Admin's visibility is narrowed to public groups + their own.
 */
export async function listGroups(actor, {
  q = '',
  visibility,
  createdById,
  page = 1,
  limit = PAGE_DEFAULT,
} = {}) {
  const take = Math.min(Math.max(1, Number(limit) || PAGE_DEFAULT), PAGE_MAX);
  const skip = (Math.max(1, Number(page) || 1) - 1) * take;

  const where = { type: 'group' };

  if (q) where.name = { contains: String(q), mode: 'insensitive' };
  if (visibility) where.visibility = visibility;
  if (createdById) where.createdById = createdById;

  // Admins see only public groups + their own private ones.
  if (actor.role !== 'superadmin') {
    where.OR = [
      { visibility: 'public' },
      { createdById: actor.id },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: [{ memberCount: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
      include: {
        createdBy: {
          select: {
            id: true, email: true, firstName: true, lastName: true, photoUrl: true,
          },
        },
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  return {
    groups: rows.map(serializeGroupListItem),
    total,
    page: Math.max(1, Number(page) || 1),
    limit: take,
    pages: Math.ceil(total / take),
  };
}

/* ------------------------------------------------------------------ */
/*  Detail                                                             */
/* ------------------------------------------------------------------ */

export async function getGroup(actor, groupId) {
  const group = await assertGroupAdminPermission(actor, groupId);
  return serializeGroupDetail(group);
}

/* ------------------------------------------------------------------ */
/*  Create                                                             */
/* ------------------------------------------------------------------ */

/**
 * Create a group.
 *
 * Admin      → visibility is forced to 'public' (403 on 'private').
 * Superadmin → may pick either.
 *
 * The creator becomes the group's `owner` and is included in memberCount.
 * `initialMemberIds` are added as 'member' in the same transaction.
 */
export async function createGroup(actor, payload) {
  const {
    name,
    description = '',
    visibility = 'public',
    color = '#F59E0B',
    iconEmoji = null,
    initialMemberIds = [],
  } = payload;

  if (actor.role !== 'superadmin' && visibility === 'private') {
    throw new HttpError(403, 'Admins can only create public groups.');
  }

  // Deduplicate + drop the creator's own id (they're already added as owner).
  const uniqueMemberIds = [
    ...new Set((initialMemberIds || []).filter((id) => id && id !== actor.id)),
  ];

  if (uniqueMemberIds.length > 0) {
    const validUsers = await prisma.user.findMany({
      where: {
        id: { in: uniqueMemberIds },
        isBanned: false,
        emailVerified: true,
      },
      select: { id: true },
    });
    const validIds = new Set(validUsers.map((u) => u.id));
    const invalid = uniqueMemberIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      const sample = invalid.slice(0, 3).join(', ');
      const suffix = invalid.length > 3 ? ` and ${invalid.length - 3} more` : '';
      throw new HttpError(
        400,
        `Some users are invalid, banned, or unverified: ${sample}${suffix}`
      );
    }
  }

  const memberCount = 1 + uniqueMemberIds.length;

  const created = await prisma.conversation.create({
    data: {
      type: 'group',
      name: String(name).trim(),
      description: String(description || '').trim(),
      visibility,
      color,
      iconEmoji,
      createdById: actor.id,
      memberCount,
      participants: {
        create: [
          { userId: actor.id, role: 'owner' },
          ...uniqueMemberIds.map((id) => ({ userId: id, role: 'member' })),
        ],
      },
    },
    include: {
      createdBy: {
        select: {
          id: true, email: true, firstName: true, lastName: true, photoUrl: true,
        },
      },
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

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'group.create',
    targetType: 'group',
    targetId: created.id,
    metadata: {
      name: created.name,
      visibility: created.visibility,
      memberCount: created.memberCount,
      initialMemberCount: uniqueMemberIds.length,
    },
    req: actor.req,
  });

  return serializeGroupDetail(created);
}

/* ------------------------------------------------------------------ */
/*  Update                                                             */
/* ------------------------------------------------------------------ */

export async function updateGroup(actor, groupId, patch) {
  const group = await assertGroupAdminPermission(actor, groupId);

  // Admin cannot flip a public group to private (they'd lose control of it).
  if (
    patch.visibility === 'private' &&
    actor.role !== 'superadmin'
  ) {
    throw new HttpError(
      403,
      'Admins cannot change a group\'s visibility to private.'
    );
  }

  const data = {};
  if (patch.name !== undefined) data.name = String(patch.name).trim();
  if (patch.description !== undefined) {
    data.description = String(patch.description || '').trim();
  }
  if (patch.visibility !== undefined) data.visibility = patch.visibility;
  if (patch.color !== undefined) data.color = patch.color;
  if (patch.iconEmoji !== undefined) {
    data.iconEmoji = patch.iconEmoji ? String(patch.iconEmoji) : null;
  }

  if (Object.keys(data).length === 0) {
    return serializeGroupDetail(group);
  }

  const updated = await prisma.conversation.update({
    where: { id: groupId },
    data,
    include: {
      createdBy: {
        select: {
          id: true, email: true, firstName: true, lastName: true, photoUrl: true,
        },
      },
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

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'group.update',
    targetType: 'group',
    targetId: groupId,
    metadata: {
      patch,
      previous: {
        name: group.name,
        visibility: group.visibility,
        color: group.color,
      },
    },
    req: actor.req,
  });

  return serializeGroupDetail(updated);
}

/* ------------------------------------------------------------------ */
/*  Delete                                                             */
/* ------------------------------------------------------------------ */

/**
 * Hard-delete a group. Cascades to participants and messages via FK.
 * The count of cascaded messages is logged in the audit metadata so an
 * operator can see the blast radius after the fact.
 */
export async function deleteGroup(actor, groupId) {
  const group = await assertGroupAdminPermission(actor, groupId);

  const messageCount = await prisma.message.count({
    where: { conversationId: groupId },
  });
  const memberCount = group.participants.length;

  await prisma.conversation.delete({ where: { id: groupId } });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'group.delete',
    targetType: 'group',
    targetId: groupId,
    metadata: {
      name: group.name,
      visibility: group.visibility,
      cascadedMessages: messageCount,
      cascadedMembers: memberCount,
    },
    req: actor.req,
  });

  return { ok: true, cascadedMessages: messageCount, cascadedMembers: memberCount };
}

/* ------------------------------------------------------------------ */
/*  Member management                                                  */
/* ------------------------------------------------------------------ */

/**
 * Add a member to a group. Idempotent — adding an existing member returns
 * `{ ok: true, alreadyMember: true }` without touching memberCount.
 */
export async function addGroupMember(actor, groupId, userId) {
  const group = await assertGroupAdminPermission(actor, groupId);

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isBanned: true, emailVerified: true, email: true },
  });
  if (!targetUser || targetUser.isBanned) {
    throw new HttpError(404, 'User not found or is banned');
  }
  if (!targetUser.emailVerified) {
    throw new HttpError(403, 'Cannot add a user whose email is not verified');
  }

  const existing = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: groupId, userId } },
    select: { id: true },
  });
  if (existing) {
    return { ok: true, alreadyMember: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.conversationParticipant.create({
      data: { conversationId: groupId, userId, role: 'member' },
    });
    await tx.conversation.update({
      where: { id: groupId },
      data: { memberCount: { increment: 1 } },
    });
  });

  // Notify the new member so their chat list refreshes live.
  broadcastToUser(userId, 'invalidate', { keys: [['chat', 'conversations']] });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'group.member.add',
    targetType: 'group',
    targetId: groupId,
    metadata: { groupName: group.name, memberId: userId, memberEmail: targetUser.email },
    req: actor.req,
  });

  return { ok: true };
}

/**
 * Remove a member from a group.
 *
 * Guards:
 *   • Cannot remove the last owner.
 *   • Idempotent — removing a non-member returns ok without touching counts.
 */
export async function removeGroupMember(actor, groupId, userId) {
  const group = await assertGroupAdminPermission(actor, groupId);

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: groupId, userId } },
    select: { id: true, role: true },
  });

  if (!participant) {
    return { ok: true, notAMember: true };
  }

  if (participant.role === 'owner') {
    const ownerCount = await prisma.conversationParticipant.count({
      where: { conversationId: groupId, role: 'owner' },
    });
    if (ownerCount <= 1) {
      throw new HttpError(
        400,
        'Cannot remove the last owner. Promote another member to owner first.'
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

  broadcastToUser(userId, 'invalidate', { keys: [['chat', 'conversations']] });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'group.member.remove',
    targetType: 'group',
    targetId: groupId,
    metadata: { groupName: group.name, memberId: userId },
    req: actor.req,
  });

  return { ok: true };
}

/**
 * Change a member's role.
 *
 * Owner semantics: exactly one owner per group.
 *   • Promoting userId to 'owner' DEMOTES the current owner to 'member'
 *     inside the same transaction.
 *   • Demoting the only owner is rejected.
 *
 * Idempotent — setting a member's role to its current value returns
 * `{ ok: true, unchanged: true }`.
 */
export async function setGroupMemberRole(actor, groupId, userId, newRole) {
  const group = await assertGroupAdminPermission(actor, groupId);

  const target = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: groupId, userId } },
    select: { id: true, role: true },
  });
  if (!target) {
    throw new HttpError(404, 'User is not a member of this group');
  }

  if (target.role === newRole) {
    return { ok: true, unchanged: true };
  }

  const previousRole = target.role;

  await prisma.$transaction(async (tx) => {
    // Guard: demoting the last owner is not allowed.
    if (previousRole === 'owner' && newRole !== 'owner') {
      const otherOwners = await tx.conversationParticipant.count({
        where: {
          conversationId: groupId,
          role: 'owner',
          userId: { not: userId },
        },
      });
      if (otherOwners === 0) {
        throw new HttpError(
          400,
          'Cannot demote the only owner. Promote another member to owner first.'
        );
      }
    }

    // Promote: demote the existing owner(s) first.
    if (newRole === 'owner') {
      await tx.conversationParticipant.updateMany({
        where: {
          conversationId: groupId,
          role: 'owner',
          userId: { not: userId },
        },
        data: { role: 'member' },
      });
    }

    await tx.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: groupId, userId } },
      data: { role: newRole },
    });
  });

  broadcastToUser(userId, 'invalidate', { keys: [['chat', 'conversations']] });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'group.member.role',
    targetType: 'group',
    targetId: groupId,
    metadata: {
      groupName: group.name,
      memberId: userId,
      from: previousRole,
      to: newRole,
    },
    req: actor.req,
  });

  return { ok: true, role: newRole };
}