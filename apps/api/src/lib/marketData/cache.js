// apps/api/src/lib/marketData/cache.js
//
// Tiny in-memory TTL cache for Yahoo bar payloads.
//
// Single-process only. If we ever scale out, swap for Redis — the
// get/set signature is deliberately Redis-shaped to make that a drop-in.

const store = new Map(); // key → { value, expiresAt }

export function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function set(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidate(key) {
  store.delete(key);
}

export function clearAll() {
  store.clear();
}

export function size() {
  return store.size;
}

// Prune expired entries once a minute. .unref() so this timer never keeps
// the Node process alive on its own.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}, 60_000).unref?.();