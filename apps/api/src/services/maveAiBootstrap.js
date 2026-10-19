// apps/api/src/services/maveAiBootstrap.js
//
// Boot script. Runs once at startup. Ensures:
//   1. The Mave AI sentinel user exists.
//   2. Every non-AI user has a DM conversation with Mave AI.
//   3. Caches the AI's ID in memory for fast lookup.

import { prisma } from '../lib/prisma.js';
import { 
  MAVE_AI_EMAIL, 
  MAVE_AI_FIRST_NAME, 
  MAVE_AI_LAST_NAME 
} from '@mavrix/shared';

let _cachedAiId = null;

/** Fast lookup for the Mave AI user ID. */
export function getMaveAiId() {
  return _cachedAiId;
}

export async function ensureMaveAi() {
  console.log('[mave-ai] checking bootstrap...');

  // 1. Ensure AI user exists
  let aiUser = await prisma.user.findFirst({
    where: { isAi: true },
  });

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

  // 2. Find all human users
  const users = await prisma.user.findMany({
    where: { isAi: false },
    select: { id: true },
  });

  if (users.length === 0) {
    console.log('[mave-ai] no human users yet — skipping DM generation.');
    return;
  }

  // 3. Ensure every human user has a DM with the AI
  // Doing this in parallel chunks to avoid overloading the DB connection pool
  const chunkSize = 50;
  let createdCount = 0;

  for (let i = 0; i < users.length; i += chunkSize) {
    const chunk = users.slice(i, i + chunkSize);
    
    await Promise.all(
      chunk.map(async (u) => {
        // dmKey is the sorted "aId:bId" string
        const dmKey = [u.id, aiUser.id].sort().join(':');
        
        const existing = await prisma.conversation.findUnique({
          where: { dmKey },
          select: { id: true },
        });

        if (!existing) {
          await prisma.conversation.create({
            data: {
              type: 'dm',
              dmKey,
              participants: {
                create: [{ userId: u.id }, { userId: aiUser.id }],
              },
            },
          });
          createdCount++;
        }
      })
    );
  }

  console.log(`[mave-ai] bootstrap complete. Sentinel ID: ${aiUser.id}. Created ${createdCount} new DMs.`);
}