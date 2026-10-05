// apps/api/src/lib/rateLimit.js
//
// Minimal in-memory sliding-window rate limiter for sensitive admin actions
// (ban, delete, impersonate, broadcast, settings writes).
//
// Single-process only — fine for one API instance. If we ever scale out,
// swap for Redis. The middleware signature stays the same.

const buckets = new Map(); // key → [timestamps]

/**
 * @param {object}  opts
 * @param {number}  opts.windowMs   — sliding window length
 * @param {number}  opts.max        — max requests per window
 * @param {string}  opts.keyFn      — (req) => string; default userId+IP
 * @param {string=} opts.message    — error message
 */
export function rateLimit({ windowMs, max, keyFn, message } = {}) {
  const window = windowMs || 60_000;
  const limit = max || 30;
  const makeKey =
    keyFn ||
    ((req) =>
      `${req.userId || 'anon'}:${
        req.ip || req.socket?.remoteAddress || 'unknown'
      }`);

  return function limiter(req, res, next) {
    const key = makeKey(req);
    const now = Date.now();
    const arr = buckets.get(key) || [];

    // Drop entries outside the window.
    const recent = arr.filter((t) => now - t < window);

    if (recent.length >= limit) {
      const retryAfter = Math.ceil(
        (window - (now - recent[0])) / 1000
      );
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: message || 'Too many requests. Slow down.',
        retryAfter,
      });
    }

    recent.push(now);
    buckets.set(key, recent);
    next();
  };
}

// Periodic prune to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, arr] of buckets.entries()) {
    const recent = arr.filter((t) => now - t < 5 * 60_000);
    if (recent.length === 0) buckets.delete(key);
    else buckets.set(key, recent);
  }
}, 60_000).unref?.();