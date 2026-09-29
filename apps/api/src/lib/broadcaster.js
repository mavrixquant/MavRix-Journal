// apps/api/src/lib/broadcaster.js
//
// In-memory registry of connected SSE clients, keyed by userId.
//
// Single-process only. If you ever run multiple API instances behind a load
// balancer, swap this for Redis pub/sub. That migration is contained to this
// file — callers only use broadcastToUser() / broadcastToAll().

const clients = new Map(); // userId -> Set<res>

export function addClient(userId, res) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);
}

export function removeClient(userId, res) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(userId);
}

/**
 * Push an event to every open SSE stream belonging to `userId`.
 * Payload is JSON-stringified automatically.
 * Silently skips dead sockets.
 */
export function broadcastToUser(userId, event, payload) {
  const set = clients.get(userId);
  if (!set || set.size === 0) return 0;

  const chunk = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

  let sent = 0;
  for (const res of set) {
    try {
      res.write(chunk);
      sent += 1;
    } catch {
      // Socket is dead. Cleanup happens on 'close' — nothing to do here.
    }
  }
  return sent;
}

/**
 * Push an event to EVERY connected client, regardless of userId.
 *
 * Used for global broadcasts where the data isn't user-scoped — e.g. the
 * economic calendar, which is shared across all accounts and all users.
 *
 * If a client's socket throws (dead connection), we swallow the error and
 * count it as not-sent. The 'close' handler will clean it up.
 */
export function broadcastToAll(event, payload) {
  const chunk = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

  let sent = 0;
  for (const set of clients.values()) {
    for (const res of set) {
      try {
        res.write(chunk);
        sent += 1;
      } catch {
        // Dead socket. 'close' handler will remove it.
      }
    }
  }
  return sent;
}

/** Diagnostics — number of open streams for a user. */
export function getClientCount(userId) {
  return clients.get(userId)?.size ?? 0;
}

/** Diagnostics — total open streams across all users. */
export function getTotalClientCount() {
  let total = 0;
  for (const set of clients.values()) total += set.size;
  return total;
}