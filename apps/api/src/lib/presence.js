// ============================================================================
// Presence tracking — which conversations is each user actively viewing?
//
// Used by chat.service.sendMessage to SKIP notification creation for
// recipients who already have the thread open. The message still arrives
// via SSE; the client's own markRead effect sweeps any older notifications.
// Result: zero bell-badge flicker and zero stray rows in the sidebar list.
//
// Storage: in-memory, per-process. On multi-instance deployments a user on
// instance A won't be seen as "viewing" by a notification created on B —
// acceptable trade-off (worst case = one extra notification the client
// sweeps away instantly via markRead). A Redis-backed version is the
// obvious next step if we ever scale horizontally.
//
// Each user holds a SET of conversation ids because the app legitimately
// mounts two MessageThreads at once: the ChatsPage thread and the Mave AI
// sidebar thread. A single-slot map would clobber one when the other mounts.
//
// TTL is a safety net — if a client crashes without sending active:false,
// the entry expires. Normal cleanup is explicit on unmount.
// ============================================================================

const PRESENCE_TTL_MS = 90_000;
const SWEEP_INTERVAL_MS = 60_000;

const state = new Map(); // userId -> Map<conversationId, expiresAtMs>

export function setViewing(userId, conversationId, active) {
  if (!userId || !conversationId) return;

  let map = state.get(userId);
  if (!map) {
    map = new Map();
    state.set(userId, map);
  }

  if (active) {
    map.set(conversationId, Date.now() + PRESENCE_TTL_MS);
  } else {
    map.delete(conversationId);
    if (map.size === 0) state.delete(userId);
  }
}

export function isViewing(userId, conversationId) {
  if (!userId || !conversationId) return false;
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

export function listViewing(userId) {
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

setInterval(() => {
  const now = Date.now();
  for (const [userId, map] of state.entries()) {
    for (const [conversationId, expiresAt] of map) {
      if (expiresAt < now) map.delete(conversationId);
    }
    if (map.size === 0) state.delete(userId);
  }
}, SWEEP_INTERVAL_MS).unref?.();