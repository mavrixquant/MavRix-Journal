// apps/api/src/middleware/auth.js
import { verifyAccessToken } from '../lib/jwt.js';
import { HttpError } from './error.js';
import { resolveSv } from '../lib/session.js';

/**
 * Standard Bearer-token auth for normal API requests.
 *
 * Beyond signature/expiry, we validate the token's `sv` claim against the
 * user's current `tokenVersion`. That value is bumped by:
 *   - admin "force logout"
 *   - admin ban
 *   - password reset
 * so an issued access token dies the moment the session is revoked.
 *
 * `sv` is read through a 30s in-memory cache (see lib/session.js) so a
 * normal request path is one map lookup, not a DB round trip.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return next(new HttpError(401, 'Missing access token'));

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new HttpError(401, 'Invalid or expired access token'));
  }

  // Legacy tokens issued before this change have no sv — treat as 0.
  const tokenSv = Number.isFinite(payload.sv) ? payload.sv : 0;

  let actualSv;
  try {
    actualSv = await resolveSv(payload.sub);
  } catch (e) {
    return next(e);
  }

  if (actualSv == null) {
    return next(new HttpError(401, 'User no longer exists'));
  }
  if (actualSv !== tokenSv) {
    return next(new HttpError(401, 'Session revoked'));
  }

  req.userId = payload.sub;
  req.userRole = payload.role || 'user';
  req.userSv = tokenSv;
  next();
}

/**
 * Auth for Server-Sent Events.
 *
 * EventSource can't send custom headers, so we accept the access token
 * from a `?token=` query param. Falls back to the Bearer header for any
 * non-browser caller (Postman, curl, tests).
 *
 * Same sv check as requireAuth.
 */
export async function requireAuthSSE(req, res, next) {
  const header = req.headers.authorization || '';
  const headerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = headerToken || req.query.token;

  if (!token) return next(new HttpError(401, 'Missing access token'));

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new HttpError(401, 'Invalid or expired access token'));
  }

  const tokenSv = Number.isFinite(payload.sv) ? payload.sv : 0;

  let actualSv;
  try {
    actualSv = await resolveSv(payload.sub);
  } catch (e) {
    return next(e);
  }

  if (actualSv == null) {
    return next(new HttpError(401, 'User no longer exists'));
  }
  if (actualSv !== tokenSv) {
    return next(new HttpError(401, 'Session revoked'));
  }

  req.userId = payload.sub;
  req.userRole = payload.role || 'user';
  req.userSv = tokenSv;
  next();
}