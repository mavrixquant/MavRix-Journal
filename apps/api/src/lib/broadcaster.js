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

/**
 * Force-close every SSE stream for a given user.
 * Used by the admin "force logout" / "kick session" controls.
 *
 * Returns the number of sockets that were closed.
 */
export function disconnectUser(userId) {
  const set = clients.get(userId);
  if (!set) return 0;

  let closed = 0;
  for (const res of set) {
    try {
      // Notify the client before closing so the browser can react
      // (e.g. show a "you were signed out" toast before reconnecting).
      res.write(
        `event: forced-logout\ndata: ${JSON.stringify({
          reason: 'admin',
          ts: Date.now(),
        })}\n\n`
      );
    } catch {
      // ignore
    }
    try {
      res.end();
      closed += 1;
    } catch {
      // ignore
    }
  }
  clients.delete(userId);
  return closed;
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