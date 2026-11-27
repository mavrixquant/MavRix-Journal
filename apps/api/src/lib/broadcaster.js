// ============================================================================
// SSE Broadcaster — optionally Redis-backed for multi-instance deployments
//
// E1 (Phase 2): Horizontal Scaling — Replace in-memory broadcaster with
// Redis pub/sub when USE_REDIS_BROADCAST=true
// ============================================================================

import Redis from 'ioredis';

const USE_REDIS = process.env.USE_REDIS_BROADCAST === 'true';

let redis;
let sub;
if (USE_REDIS) {
  redis = new Redis(process.env.REDIS_URL);
  redis.on('error', (err) => console.error('[Redis] Broadcaster error:', err));

  // Subscriber for cross-process messages
  sub = new Redis(process.env.REDIS_URL);
  sub.on('error', (err) => console.error('[Redis] Broadcaster sub error:', err));
}

const clients = new Map(); // userId -> Set<Response>

export function addClient(userId, res) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);

  if (USE_REDIS) {
    // Subscribe to user's channel for cross-process messages
    sub.subscribe(`sse:${userId}`);
    sub.on('message', (channel, message) => {
      if (channel === `sse:${userId}`) {
        try {
          const data = JSON.parse(message);
          res.write(`event: ${data.event}\ndata: ${JSON.stringify(data.payload)}\n\n`);
        } catch {}
      }
    });
    res._sub = `sse:${userId}`;
  }
}

export function removeClient(userId, res) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(userId);

  if (res._sub && sub) {
    sub.unsubscribe(res._sub);
    delete res._sub;
  }
}

export function broadcastToUser(userId, event, payload) {
  let sent = 0;

  // In-process clients
  const set = clients.get(userId);
  if (set && set.size > 0) {
    const chunk = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const res of set) {
      try {
        res.write(chunk);
        sent += 1;
      } catch {}
    }
  }

  // Cross-process via Redis
  if (USE_REDIS && redis) {
    const channel = `sse:${userId}`;
    const msg = JSON.stringify({ event, payload, ts: Date.now() });
    redis.publish(channel, msg);
  }

  return sent;
}

export function broadcastToAll(event, payload) {
  let sent = 0;

  // In-process clients
  for (const set of clients.values()) {
    const chunk = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const res of set) {
      try {
        res.write(chunk);
        sent += 1;
      } catch {}
    }
  }

  // Cross-process via Redis
  if (USE_REDIS && redis) {
    const channel = `sse:all`;
    const msg = JSON.stringify({ event, payload, ts: Date.now() });
    redis.publish(channel, msg);
  }

  return sent;
}

export function disconnectUser(userId) {
  let closed = 0;

  const set = clients.get(userId);
  if (set) {
    for (const res of set) {
      try {
        res.write(
          `event: forced-logout\ndata: ${JSON.stringify({
            reason: 'admin',
            ts: Date.now(),
          })}\n\n`
        );
      } catch {}
      try {
        res.end();
        closed += 1;
      } catch {}
      if (res._sub && sub) {
        sub.unsubscribe(res._sub);
      }
    }
    clients.delete(userId);
  }

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