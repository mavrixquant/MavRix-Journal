
const clients = new Map();

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
    }
  }
  return sent;
}

export function broadcastToAll(event, payload) {
  const chunk = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

  let sent = 0;
  for (const set of clients.values()) {
    for (const res of set) {
      try {
        res.write(chunk);
        sent += 1;
      } catch {
      }
    }
  }
  return sent;
}

export function disconnectUser(userId) {
  const set = clients.get(userId);
  if (!set) return 0;

  let closed = 0;
  for (const res of set) {
    try {
      res.write(
        `event: forced-logout\ndata: ${JSON.stringify({
          reason: 'admin',
          ts: Date.now(),
        })}\n\n`
      );
    } catch {
    }
    try {
      res.end();
      closed += 1;
    } catch {
    }
  }
  clients.delete(userId);
  return closed;
}

export function getClientCount(userId) {
  return clients.get(userId)?.size ?? 0;
}

export function getTotalClientCount() {
  let total = 0;
  for (const set of clients.values()) total += set.size;
  return total;
}