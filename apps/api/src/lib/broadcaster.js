// apps/api/src/lib/broadcaster.js
//
// In-memory registry of connected SSE clients, keyed by userId.
//
// Single-process only. If you ever run multiple API instances behind a load
// balancer, swap this for Redis pub/sub. That migration is contained to this
// file — callers only use broadcastToUser().

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

/** Diagnostics — number of open streams for a user. */
export function getClientCount(userId) {
  return clients.get(userId)?.size ?? 0;
}