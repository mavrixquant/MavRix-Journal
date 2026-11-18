// ============================================================================
// CSRF / cross-origin request guard.
//
// FIXED 2026-11-18 — the API authenticates refresh tokens via an httpOnly
// cookie (see controllers/auth.controller.js). httpOnly protects the token
// from XSS, but a cookie-authenticated state-changing request is still
// forgeable from another origin unless the server checks where the request
// came from.
//
// This middleware does origin-based validation:
//   • Safe methods (GET / HEAD / OPTIONS) are never blocked.
//   • Requests must carry an Origin (or Referer fallback) that matches the
//     configured CLIENT_ORIGIN allowlist.
//   • Requests with no Origin/Referer at all are rejected for mutating
//     methods. Browsers always send Origin on cross-origin POST/PUT/PATCH/
//     DELETE, so a real browser app is unaffected; non-browser clients
//     (curl/Postman) that omit Origin are rejected, which is the safer
//     default for a cookie-authenticated API.
//
// Bearer-token requests (Authorization header) do NOT rely on cookies, so
// they cannot be forged cross-site and are exempt from the origin check.
// ============================================================================

import { env } from '../config/env.js';
import { HttpError } from './error.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const allowedOrigins = (() => {
  const list = new Set();
  const add = (value) => {
    if (!value) return;
    for (const part of String(value).split(',')) {
      const trimmed = part.trim();
      if (trimmed) list.add(trimmed.replace(/\/+$/, ''));
    }
  };
  add(env.clientOrigin);
  // Optional comma-separated extra origins for multi-host deployments.
  add(process.env.CLIENT_ORIGINS);
  return list;
})();

function originOf(req) {
  const origin = req.get?.('origin');
  if (origin) return origin.replace(/\/+$/, '');
  const referer = req.get?.('referer');
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }
  return null;
}

export function csrfGuard(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  // Bearer-authenticated requests are immune to CSRF (no ambient cookie).
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return next();

  const origin = originOf(req);
  if (!origin) {
    return next(new HttpError(403, 'Missing Origin header on a state-changing request'));
  }
  if (!allowedOrigins.has(origin)) {
    return next(new HttpError(403, 'Cross-origin request blocked'));
  }
  next();
}
