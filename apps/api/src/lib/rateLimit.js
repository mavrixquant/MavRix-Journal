// ============================================================================
// Rate Limiter — optionally Redis-backed for multi-instance deployments
//
// E2 (Phase 2): Horizontal Scaling — Replace in-memory rate limiter with
// Redis sliding window when USE_REDIS_RATE_LIMIT=true
// ============================================================================

import Redis from 'ioredis';

const USE_REDIS = process.env.USE_REDIS_RATE_LIMIT === 'true';

let redis;
if (USE_REDIS) {
  redis = new Redis(process.env.REDIS_URL);
  redis.on('error', (err) => console.error('[Redis] Rate limit error:', err));
}

const buckets = new Map(); // In-memory fallback

export function rateLimit({ windowMs, max, keyFn, message } = {}) {
  const window = windowMs || 60_000;
  const limit = max || 30;
  const makeKey =
    keyFn ||
    ((req) =>
      `${req.userId || 'anon'}:${
        req.ip || req.socket?.remoteAddress || 'unknown'
      }`);

  return async function limiter(req, res, next) {
    const key = makeKey(req);
    const now = Date.now();

    if (USE_REDIS && redis) {
      // Redis-based sliding window
      const redisKey = `ratelimit:${key}`;

      // Remove expired entries and get current count
      const [_removed, count] = await Promise.all([
        redis.zremrangebyscore(redisKey, 0, now - window),
        redis.zcard(redisKey),
      ]);

      if (count >= limit) {
        const oldest = await redis.zrange(redisKey, 0, 0, 'WITHSCORES');
        const retryAfter = oldest.length > 1
          ? Math.ceil((parseInt(oldest[1]) + window - now) / 1000)
          : Math.ceil(window / 1000);
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: message || 'Too many requests. Slow down.',
          retryAfter,
        });
      }

      // Add current request
      await redis.zadd(redisKey, now, `${now}:${Math.random()}`);
      await redis.expire(redisKey, Math.ceil(window / 1000));
    } else {
      // In-memory fallback
      const arr = buckets.get(key) || [];
      const recent = arr.filter((t) => now - t < window);

      if (recent.length >= limit) {
        const retryAfter = Math.ceil((window - (now - recent[0])) / 1000);
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: message || 'Too many requests. Slow down.',
          retryAfter,
        });
      }

      recent.push(now);
      buckets.set(key, recent);
    }

    next();
  };
}

// Cleanup interval for in-memory buckets
setInterval(() => {
  const now = Date.now();
  for (const [key, arr] of buckets.entries()) {
    const recent = arr.filter((t) => now - t < 5 * 60_000);
    if (recent.length === 0) buckets.delete(key);
    else buckets.set(key, recent);
  }
}, 60_000).unref?.();