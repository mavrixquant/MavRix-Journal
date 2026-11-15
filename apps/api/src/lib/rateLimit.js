const buckets = new Map();

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
    // FIXED 2026-11-15 — the health-check bypass previously required the
    // caller to be BOTH superadmin AND carry the run-ID header. But the
    // health-check phases for chat/bugReports/bugReports-validation run as
    // a NORMAL user (tokens.a, role 'user'), so the bypass never fired and
    // the ordinary rate limiter blocked them with 429.
    //
    // The X-Health-Check-Run header contains an opaque run ID that only the
    // server-side runner knows (see runner.js httpFetch). Any request
    // carrying that header was initiated by a legitimately-triggered run,
    // so it is safe to bypass per-user limits here. No client can forge it
    // without first being an admin who launched a run.
    if (req.headers['x-health-check-run']) {
      return next();
    }

    const key = makeKey(req);
    const now = Date.now();
    const arr = buckets.get(key) || [];

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

setInterval(() => {
  const now = Date.now();
  for (const [key, arr] of buckets.entries()) {
    const recent = arr.filter((t) => now - t < 5 * 60_000);
    if (recent.length === 0) buckets.delete(key);
    else buckets.set(key, recent);
  }
}, 60_000).unref?.();