import { verifyAccessToken } from '../lib/jwt.js';
import { HttpError } from './error.js';
import { resolveSv } from '../lib/session.js';

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