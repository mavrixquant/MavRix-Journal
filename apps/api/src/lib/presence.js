// ============================================================================
// Presence tracking — optionally Redis-backed for multi-instance deployments
//
// N3 (Phase 2): Horizontal Scaling — Replace in-memory presence with
// Redis sets when USE_REDIS_PRESENCE=true
//
// Used by chat.service.sendMessage to SKIP notification creation for
// recipients who already have the thread open. The message still arrives
// via SSE; the client's own markRead effect sweeps any older notifications.
// Result: zero bell-badge flicker and zero stray rows in the sidebar list.
//
// Storage: In-memory (default) or Redis (when USE_REDIS_PRESENCE=true).
// A user on instance A won't be seen as "viewing" by a notification on B
// unless Redis is enabled — acceptable trade-off (extra notification swept
// away instantly via markRead).
//
// Each user holds a SET of conversation ids because the app legitimately
// mounts two MessageThreads at once: the ChatsPage thread and the Mave AI
// sidebar thread.
//
// TTL is a safety net — if a client crashes without sending active:false,
// the entry expires. Normal cleanup is explicit on unmount.
// ============================================================================

import Redis from 'ioredis';

const USE_REDIS = process.env.USE_REDIS_PRESENCE === 'true';

let redis;
if (USE_REDIS) {
  redis = new Redis(process.env.REDIS_URL);
  redis.on('error', (err) => console.error('[Redis] Presence error:', err));
}

const PRESENCE_TTL_S = 90; // seconds

// In-memory fallback implementation
const state = new Map(); // userId -> Map<conversationId, expiresAtMs>

export async function setViewing(userId, conversationId, active) {
  if (!userId || !conversationId) return;

  if (USE_REDIS && redis) {
    const key = `presence:${userId}:${conversationId}`;
    if (active) {
      await redis.set(key, '1', 'EX', PRESENCE_TTL_S);
    } else {
      await redis.del(key);
    }
  } else {
    let map = state.get(userId);
    if (!map) {
      map = new Map();
      state.set(userId, map);
    }

    if (active) {
      map.set(conversationId, Date.now() + PRESENCE_TTL_S * 1000);
    } else {
      map.delete(conversationId);
      if (map.size === 0) state.delete(userId);
    }
  }
}

export async function isViewing(userId, conversationId) {
  if (!userId || !conversationId) return false;

  if (USE_REDIS && redis) {
    const key = `presence:${userId}:${conversationId}`;
    const exists = await redis.exists(key);
    return exists === 1;
  }

  const map = state.get(userId);
  if (!map) return false;
  const expiresAt = map.get(conversationId);
  if (!expiresAt) return false;
  if (expiresAt < Date.now()) {
    map.delete(conversationId);
    if (map.size === 0) state.delete(userId);
    return false;
  }
  return true;
}

export async function listViewing(userId) {
  if (!userId) return [];

  if (USE_REDIS && redis) {
    // Use SCAN for non-blocking iteration
    let cursor = '0';
    const conversations = [];

    while (cursor !== '0') {
      const result = await redis.scanAsync(cursor, 'MATCH', `presence:${userId}:*`, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];

      for (const key of keys) {
        const parts = key.split(':');
        if (parts.length === 3) {
          conversations.push(parts[2]);
          // Set expiry on the key
          await redis.expire(key, PRESENCE_TTL_S);
        }
      }
    }

    return conversations;
  }

  const map = state.get(userId);
  if (!map) return [];
  const now = Date.now();
  const out = [];
  for (const [conversationId, expiresAt] of map) {
    if (expiresAt >= now) out.push(conversationId);
    else map.delete(conversationId);
  }
  if (map.size === 0) state.delete(userId);
  return out;
}

// Cleanup interval for in-memory entries
const SWEEP_INTERVAL_MS = 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [userId, map] of state.entries()) {
    for (const [conversationId, expiresAt] of map) {
      if (expiresAt < now) map.delete(conversationId);
    }
    if (map.size === 0) state.delete(userId);
  }
}, SWEEP_INTERVAL_MS).unref?.();