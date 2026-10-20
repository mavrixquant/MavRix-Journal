
import { env } from '../../config/env.js';

const buckets = new Map();

export function checkRateLimit(userId) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const max = env.ai.userRatePerHour;

  const arr = buckets.get(userId) || [];
  
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

setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  for (const [userId, arr] of buckets.entries()) {
    const recent = arr.filter((t) => now - t < windowMs);
    if (recent.length === 0) buckets.delete(userId);
    else buckets.set(userId, recent);
  }
}, 5 * 60_000).unref?.();