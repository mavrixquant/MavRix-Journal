// apps/api/src/lib/ai/limiter.js
//
// In-memory sliding-window rate limiter for Mave AI.
// Prevents users from spamming the admin API keys.
//
// Single-process only (resets on server restart). If you scale to multiple
// API instances, swap this for a Redis store.

import { env } from '../../config/env.js';

const buckets = new Map(); // userId -> [timestamps]

export function checkRateLimit(userId) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const max = env.ai.userRatePerHour;

  const arr = buckets.get(userId) || [];
  
  // Drop entries outside the 1-hour window
  const recent = arr.filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    const oldest = recent[0];
    const retryAfterMs = windowMs - (now - oldest);
    return { 
      allowed: false, 
      retryAfterMs,
      limit: max,
      current: recent.length
    };
  }

  recent.push(now);
  buckets.set(userId, recent);
  
  return { allowed: true, limit: max, current: recent.length };
}

// Periodic prune to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  for (const [userId, arr] of buckets.entries()) {
    const recent = arr.filter((t) => now - t < windowMs);
    if (recent.length === 0) buckets.delete(userId);
    else buckets.set(userId, recent);
  }
}, 5 * 60_000).unref?.();