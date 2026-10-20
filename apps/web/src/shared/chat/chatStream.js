
const TYPING_TTL_MS = 4000;
const SWEEP_INTERVAL_MS = 1500;

const typingState = new Map();

const listeners = new Set();

function notify() {
  for (const fn of listeners) {
    try { fn(); } catch { }
  }
}

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

export function subscribeTyping(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

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

export function clearTypingState(conversationId) {
  if (typingState.delete(conversationId)) notify();
}

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