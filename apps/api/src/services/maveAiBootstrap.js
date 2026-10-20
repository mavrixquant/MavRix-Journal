
import { prisma } from '../lib/prisma.js';
import {
  MAVE_AI_EMAIL,
  MAVE_AI_FIRST_NAME,
  MAVE_AI_LAST_NAME,
} from '@mavrix/shared';

let _cachedAiId = null;

export function getMaveAiId() {
  return _cachedAiId;
}

export async function ensureAiDmForUser(userId) {
  if (!userId || !_cachedAiId) return null;
  if (userId === _cachedAiId) return null;

  const dmKey = [userId, _cachedAiId].sort().join(':');

  const existing = await prisma.conversation.findUnique({
    where: { dmKey },
    select: { id: true },
  });
  if (existing) return existing.id;

  try {
    const created = await prisma.conversation.create({
      data: {
        type: 'dm',
        dmKey,
        participants: {
          create: [{ userId }, { userId: _cachedAiId }],
        },
      },
      select: { id: true },
    });
    return created.id;
  } catch (err) {
    if (err?.code === 'P2002') {
      const row = await prisma.conversation.findUnique({
        where: { dmKey },
        select: { id: true },
      });
      return row?.id || null;
    }
    throw err;
  }
}

export async function ensureMaveAi() {
  console.log('[mave-ai] checking bootstrap...');

  let aiUser = await prisma.user.findFirst({ where: { isAi: true } });

  if (!aiUser) {
    console.log('[mave-ai] creating sentinel user...');
    aiUser = await prisma.user.create({
      data: {
        email: MAVE_AI_EMAIL,
        firstName: MAVE_AI_FIRST_NAME,
        lastName: MAVE_AI_LAST_NAME,
        isAi: true,
        emailVerified: true,
        role: 'user',
      },
    });
  }

  _cachedAiId = aiUser.id;

  const users = await prisma.user.findMany({
    where: { isAi: false },
    select: { id: true },
  });

  if (users.length === 0) {
    console.log('[mave-ai] no human users yet — skipping DM generation.');
    return;
  }

  const chunkSize = 50;
  let ensured = 0;
  let failed = 0;

  for (let i = 0; i < users.length; i += chunkSize) {
    const chunk = users.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (u) => {
        try {
          await ensureAiDmForUser(u.id);
          ensured++;
        } catch (err) {
          failed++;
          console.warn(`[mave-ai] failed to ensure DM for ${u.id}:`, err.message);
        }
      })
    );
  }

  console.log(
    `[mave-ai] bootstrap complete. Sentinel ID: ${aiUser.id}. ` +
      `Ensured ${ensured} user DM(s)${failed ? `, ${failed} failed` : ''}.`
  );
}