// ============================================================================
// Default channels bootstrap.
//
// Three channels exist for every user out of the box: Announcements, General,
// Trades. They are ordinary `type='group'` rows flagged isDefault = true.
//
//   ensureDefaultChannels()       — on boot. Creates missing defaults, then
//                                   catches every non-AI user up.
//   addUserToDefaultChannels(id)  — on signup / login. Ensures this one user
//                                   is a member of every default channel.
//
// Both functions are fully idempotent and tolerate races (P2002 is swallowed).
// ============================================================================

import { prisma } from '../lib/prisma.js';

const DEFAULT_CHANNELS = [
  {
    name: 'Announcements',
    description: 'Official updates from the MavRix team.',
    iconEmoji: '??',
    color: '#F59E0B',
  },
  {
    name: 'General',
    description: 'Open chat for anything trading-related.',
    iconEmoji: '??',
    color: '#378ADD',
  },
  {
    name: 'Trades',
    description: 'Share setups, entries, exits, and post-mortems.',
    iconEmoji: '??',
    color: '#4ade80',
  },
];

async function findOrCreateChannel(spec, adminId) {
  const existing = await prisma.conversation.findFirst({
    where: { type: 'group', name: spec.name, isDefault: true },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.conversation.create({
    data: {
      type: 'group',
      name: spec.name,
      description: spec.description,
      visibility: 'public',
      color: spec.color,
      iconEmoji: spec.iconEmoji,
      createdById: adminId || null,
      memberCount: 0,
      isDefault: true,
    },
    select: { id: true },
  });
  console.log(`[channels] created default channel #${spec.name} -> ${created.id}`);
  return created.id;
}

async function joinAllNonAiUsers(channelId) {
  const users = await prisma.user.findMany({
    where: { isAi: false },
    select: { id: true },
  });
  if (users.length === 0) return 0;

  const existing = await prisma.conversationParticipant.findMany({
    where: { conversationId: channelId },
    select: { userId: true },
  });
  const have = new Set(existing.map((r) => r.userId));
  const toAdd = users.filter((u) => !have.has(u.id));
  if (toAdd.length === 0) return 0;

  const CHUNK = 500;
  let added = 0;
  for (let i = 0; i < toAdd.length; i += CHUNK) {
    const chunk = toAdd.slice(i, i + CHUNK);
    try {
      const res = await prisma.conversationParticipant.createMany({
        data: chunk.map((u) => ({
          conversationId: channelId,
          userId: u.id,
          role: 'member',
        })),
        skipDuplicates: true,
      });
      added += res.count;
    } catch (err) {
      console.warn(`[channels] batch add failed for ${channelId}:`, err?.message || err);
    }
  }

  if (added > 0) {
    await prisma.conversation
      .update({
        where: { id: channelId },
        data: { memberCount: { increment: added } },
      })
      .catch(() => {});
  }
  return added;
}

export async function ensureDefaultChannels() {
  console.log('[channels] checking default channels…');

  const admin = await prisma.user.findFirst({
    where: { role: 'superadmin' },
    select: { id: true },
  });

  let totalAdded = 0;
  for (const spec of DEFAULT_CHANNELS) {
    try {
      const channelId = await findOrCreateChannel(spec, admin?.id);
      const added = await joinAllNonAiUsers(channelId);
      totalAdded += added;
      if (added > 0) {
        console.log(`[channels] joined ${added} user(s) to #${spec.name}`);
      }
    } catch (err) {
      console.error(`[channels] failed for #${spec.name}:`, err?.message || err);
    }
  }

  console.log(`[channels] bootstrap complete (${totalAdded} new membership(s)).`);
}

export async function addUserToDefaultChannels(userId) {
  if (!userId) return 0;

  let added = 0;
  for (const spec of DEFAULT_CHANNELS) {
    try {
      const channel = await prisma.conversation.findFirst({
        where: { type: 'group', name: spec.name, isDefault: true },
        select: { id: true },
      });
      if (!channel) continue;

      const exists = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: { conversationId: channel.id, userId },
        },
        select: { id: true },
      });
      if (exists) continue;

      await prisma.$transaction([
        prisma.conversationParticipant.create({
          data: { conversationId: channel.id, userId, role: 'member' },
        }),
        prisma.conversation.update({
          where: { id: channel.id },
          data: { memberCount: { increment: 1 } },
        }),
      ]);
      added += 1;
    } catch (err) {
      // P2002 = another request added them at the same moment. Fine.
      if (err?.code !== 'P2002') {
        console.warn(
          `[channels] failed to add ${userId} to #${spec.name}:`,
          err?.message || err
        );
      }
    }
  }
  return added;
}