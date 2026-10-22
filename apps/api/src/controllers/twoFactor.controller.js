import * as svc from '../services/twoFactor.service.js';

// --- public (session-token auth) -----------------------------------------

export async function verifyLogin(req, res, next) {
  try {
    const { sessionToken, method, code } = req.body || {};
    if (!sessionToken) return res.status(400).json({ error: 'sessionToken is required' });
    if (!method) return res.status(400).json({ error: 'method is required' });
    if (!code) return res.status(400).json({ error: 'code is required' });

    const result = await svc.verifyLogin({ sessionToken, method, code });

    const REFRESH_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/api/auth',
      maxAge: REFRESH_MAX_AGE,
    });

    const { user, accessToken } = result;
    // Match the shape returned by auth.service.publicUser() at login.
    const pub = {
      id: user.id,
      email: user.email,
      username: user.username ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      photoUrl: user.photoUrl,
      hasGoogle: !!user.googleId,
      role: user.role || 'user',
      isBanned: !!user.isBanned,
      hasPassword: !!user.passwordHash,
      twoFactorEnabled: !!user.twoFactorEnabled,
    };
    res.json({ user: pub, accessToken });
  } catch (e) { next(e); }
}

export async function sendEmailOtp(req, res, next) {
  try {
    const { sessionToken } = req.body || {};
    if (!sessionToken) return res.status(400).json({ error: 'sessionToken is required' });
    const r = await svc.sendLoginEmailOtp(sessionToken);
    res.json(r);
  } catch (e) { next(e); }
}

// --- protected (requireAuth) ---------------------------------------------

export async function status(req, res, next) {
  try {
    const r = await svc.getStatus(req.userId);
    res.json(r);
  } catch (e) { next(e); }
}

export async function setupTotp(req, res, next) {
  try { res.json(await svc.setupTotp(req.userId)); }
  catch (e) { next(e); }
}

export async function confirmTotp(req, res, next) {
  try { res.json(await svc.confirmTotp(req.userId, req.body || {})); }
  catch (e) { next(e); }
}

export async function disableTotp(req, res, next) {
  try { res.json(await svc.disableTotp(req.userId, req.body || {})); }
  catch (e) { next(e); }
}

export async function enableEmail(req, res, next) {
  try { res.json(await svc.enableEmail(req.userId)); }
  catch (e) { next(e); }
}

export async function confirmEmail(req, res, next) {
  try { res.json(await svc.confirmEmail(req.userId, req.body || {})); }
  catch (e) { next(e); }
}

export async function disableEmail(req, res, next) {
  try { res.json(await svc.disableEmail(req.userId, req.body || {})); }
  catch (e) { next(e); }
}

export async function regenerateBackupCodes(req, res, next) {
  try { res.json(await svc.regenerateBackupCodes(req.userId, req.body || {})); }
  catch (e) { next(e); }
}