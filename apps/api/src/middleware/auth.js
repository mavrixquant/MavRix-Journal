import { verifyAccessToken } from '../lib/jwt.js';
import { HttpError } from './error.js';
import { resolveSv } from '../lib/session.js';

/**
 * Shared token verification logic used by both requireAuth and requireAuthSSE.
 * Extracts and validates the access token, checks session revocation via
 * tokenVersion.
 */
async function verifyToken(req, next, { allowQueryToken = false } = {}) {
  const header = req.headers.authorization || '';
  const headerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = allowQueryToken
    ? headerToken || req.query.token
    : headerToken;

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
  return { ok: true };
}

export async function requireAuth(req, res, next) {
  const result = await verifyToken(req, next);
  if (result?.ok) return next();
}

export async function requireAuthSSE(req, res, next) {
  const result = await verifyToken(req, next, { allowQueryToken: true });
  if (result?.ok) return next();
}