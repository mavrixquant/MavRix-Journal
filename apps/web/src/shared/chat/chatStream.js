// apps/web/src/shared/chat/chatStream.js
//
// Tiny pub/sub for ephemeral chat signals that DO NOT belong in the
// React Query cache. Currently only used for the typing indicator.
//
// Why not React Query:
//   - Typing is not persisted - it has a 4s TTL and expires on its own.
//   - It arrives at ~1 event per 2s while a peer types; stuffing that into
//     the query cache would thrash serialization for zero benefit.
//
// Shape:
//   typingState: Map<conversationId, Map<userId, expiresAtMs>>
//   listeners:   Set<() => void>
//
// Subscribers are called synchronously on every change. The React bindings
// live in shared/api/chat.js:
//   - useTypingIndicator(conversationId, excludeUserId)   - single thread
//   - useTypingConversations(excludeUserId)               - whole list

const TYPING_TTL_MS = 4000;
const SWEEP_INTERVAL_MS = 1500;

/** @type {Map<string, Map<string, number>>} */
const typingState = new Map();

/** @type {Set<() => void>} */
const listeners = new Set();

function notify() {
  for (const fn of listeners) {
    try { fn(); } catch { /* isolate */ }
  }
}

/**
 * Record (or clear) a peer's typing state for a conversation.
 * Called by the SSE bridge in shared/api/sse.js.
 */
export function setTypingState(conversationId, userId, isTyping) {
  if (!conversationId || !userId) return;

  let bucket = typingState.get(conversationId);
  if (!bucket) {
    bucket = new Map();
    typingState.set(conversationId, bucket);
  }

  if (isTyping) {
    bucket.set(userId, Date.now() + TYPING_TTL_MS);
  } else {
    bucket.delete(userId);
  }
  notify();
}

/**
 * Subscribe to any change. Returns an unsubscribe function.
 */
export function subscribeTyping(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Read the currently-typing user ids for a conversation, excluding `excludeUserId`.
 * Expired entries are pruned lazily on read.
 */
export function getTypingUserIds(conversationId, excludeUserId) {
  const bucket = typingState.get(conversationId);
  if (!bucket) return [];
  const now = Date.now();
  const out = [];
  for (const [uid, expiresAt] of bucket) {
    if (expiresAt < now) {
      bucket.delete(uid);
      continue;
    }
    if (uid !== excludeUserId) out.push(uid);
  }
  return out;
}

/**
 * Returns a Set of conversation IDs where at least one user OTHER than
 * `excludeUserId` is currently typing (not yet expired).
 *
 * Used by the conversation list to show an inline "typing..." hint
 * without spinning up one subscription per row.
 */
export function getTypingConversationIds(excludeUserId) {
  const out = new Set();
  const now = Date.now();
  for (const [cid, bucket] of typingState) {
    for (const [uid, expiresAt] of bucket) {
      if (expiresAt < now) continue;
      if (uid === excludeUserId) continue;
      out.add(cid);
      break;
    }
  }
  return out;
}

/** Clear everything for a conversation - called when a thread is closed. */
export function clearTypingState(conversationId) {
  if (typingState.delete(conversationId)) notify();
}

// Lazy background sweep so stale entries don't linger if nothing reads them.
if (typeof setInterval !== 'undefined') {
  const handle = setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [cid, bucket] of typingState) {
      for (const [uid, expiresAt] of bucket) {
        if (expiresAt < now) { bucket.delete(uid); changed = true; }
      }
      if (bucket.size === 0) { typingState.delete(cid); changed = true; }
    }
    if (changed) notify();
  }, SWEEP_INTERVAL_MS);
  if (handle && typeof handle.unref === 'function') handle.unref();
}