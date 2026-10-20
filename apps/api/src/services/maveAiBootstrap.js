// ============================================================================
// Bootstrap three Mave AI sentinel users (Guide / Trainer / Chat), cache
// their IDs, and ensure every human user has one DM with each persona.
//
// Role model:
//   • AI users are the ONLY accounts with role = 'ai'.
//   • isAi remains the fast boolean shortcut used throughout the app.
//   • Both are kept in sync on every bootstrap (this file).
//   • Admins cannot promote anyone to 'ai' — enforced in admin.service.js.
//
// `ensureAiDmForUser(userId)` with no persona → ensures all 3 (backward
// compatible with legacy callers like auth.service.js).
// ============================================================================

import { prisma } from '../lib/prisma.js';
import { MAVE_AI_PERSONAS } from '@mavrix/shared';

const _personaCache = {};
const _idToPersona = new Map();

// ---------------------------------------------------------------------------
// Public accessors
// ---------------------------------------------------------------------------

export function getAllMaveAiIds() {
  return Object.values(_personaCache)
    .map((p) => p?.id)
    .filter(Boolean);
}

export function getMaveAiIdForPersona(persona) {
  return _personaCache[persona]?.id || null;
}

export function getPersonaForAiId(id) {
  return _idToPersona.get(id) || null;
}

export function isAnyMaveAiId(id) {
  return _idToPersona.has(id);
}

export function getMaveAiUser(id) {
  for (const persona of Object.keys(_personaCache)) {
    if (_personaCache[persona]?.id === id) {
      return { ..._personaCache[persona], persona };
    }
  }
  return null;
}

// Legacy single-persona accessor — prefer isAnyMaveAiId / getMaveAiIdForPersona.
export function getMaveAiId() {
  return _personaCache.guide?.id || _personaCache.chat?.id || null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function ensureOnePersona(meta) {
  let user = await prisma.user.findUnique({
    where: { email: meta.email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: meta.email,
        firstName: meta.firstName,
        lastName: meta.lastName,
        isAi: true,
        role: 'ai',
        emailVerified: true,
      },
    });
    return user;
  }

  const patch = {};
  if (!user.isAi) patch.isAi = true;
  if (user.role !== 'ai') patch.role = 'ai';
  if (!user.emailVerified) patch.emailVerified = true;
  if (user.firstName !== meta.firstName) patch.firstName = meta.firstName;
  if (user.lastName !== meta.lastName) patch.lastName = meta.lastName;

  if (Object.keys(patch).length > 0) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: patch,
    });
  }

  return user;
}

function cachePersona(personaId, user) {
  _personaCache[personaId] = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
  _idToPersona.set(user.id, personaId);
}

// ---------------------------------------------------------------------------
// DM creation
// ---------------------------------------------------------------------------

async function _ensureOneDm(userId, personaId) {
  const aiId = _personaCache[personaId]?.id;
  if (!aiId) return null;
  if (userId === aiId) return null;

  const dmKey = [userId, aiId].sort().join(':');

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
          create: [{ userId }, { userId: aiId }],
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

/**
 * Ensure the DM(s) between a human user and Mave AI exist.
 *
 * @param {string} userId         The human user's id.
 * @param {string} [personaId]    'guide' | 'trainer' | 'chat'.
 *                                Omitted → ensures ALL personas (backward compat).
 * @returns {Promise<string|null>} The conversation id (or null for no-op).
 */
export async function ensureAiDmForUser(userId, personaId) {
  if (!userId) return null;

  if (!personaId) {
    let lastId = null;
    for (const meta of MAVE_AI_PERSONAS) {
      try {
        const id = await _ensureOneDm(userId, meta.id);
        if (id) lastId = id;
      } catch (err) {
        console.warn(
          `[mave-ai] failed to ensure DM for ${userId} × ${meta.id}:`,
          err.message
        );
      }
    }
    return lastId;
  }

  return _ensureOneDm(userId, personaId);
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

export async function ensureMaveAi() {
  console.log('[mave-ai] checking bootstrap…');

  // 1. Ensure a sentinel user exists per persona
  for (const meta of MAVE_AI_PERSONAS) {
    const user = await ensureOnePersona(meta);
    cachePersona(meta.id, user);
    console.log(
      `[mave-ai] persona "${meta.id}" → ${user.id} (${user.email}, role=${user.role})`
    );
  }

  // 2. Ensure every human user has one DM per persona
  const users = await prisma.user.findMany({
    where: { isAi: false },
    select: { id: true },
  });

  if (users.length === 0) {
    console.log('[mave-ai] no human users yet — skipping DM generation.');
    return;
  }

  const chunkSize = 50;
  let totalOk = 0;
  let totalFailed = 0;

  for (let i = 0; i < users.length; i += chunkSize) {
    const chunk = users.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (u) => {
        for (const meta of MAVE_AI_PERSONAS) {
          try {
            await _ensureOneDm(u.id, meta.id);
            totalOk++;
          } catch (err) {
            totalFailed++;
            console.warn(
              `[mave-ai] failed to ensure DM for ${u.id} × ${meta.id}:`,
              err.message
            );
          }
        }
      })
    );
  }

  console.log(
    `[mave-ai] bootstrap complete. Ensured ${totalOk} DM(s) across ` +
      `${users.length} user(s)` +
      (totalFailed ? `, ${totalFailed} failed` : '') +
      '.'
  );
}