// apps/api/src/middleware/auth.js
import { verifyAccessToken } from '../lib/jwt.js';
import { HttpError } from './error.js';

/**
 * Standard Bearer-token auth for normal API requests.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return next(new HttpError(401, 'Missing access token'));

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired access token'));
  }
}

/**
 * Auth for Server-Sent Events.
 *
 * EventSource can't send custom headers, so we accept the access token
 * from a `?token=` query param. Falls back to the Bearer header for any
 * non-browser caller (Postman, curl, tests).
 */
export function requireAuthSSE(req, res, next) {
  const header = req.headers.authorization || '';
  const headerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = headerToken || req.query.token;

  if (!token) return next(new HttpError(401, 'Missing access token'));

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired access token'));
  }
}