import * as authService from '../services/auth.service.js';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: REFRESH_MAX_AGE,
};

const setRefreshCookie = (res, token) =>
  res.cookie(REFRESH_COOKIE, token, cookieOptions);

const clearRefreshCookie = (res) =>
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: 0 });

export async function signup(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await authService.signup(req.body);
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ user, accessToken });
  } catch (e) { next(e); }
}

export async function login(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    setRefreshCookie(res, refreshToken);
    res.json({ user, accessToken });
  } catch (e) { next(e); }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    const { user, accessToken, refreshToken } = await authService.refresh(token);
    setRefreshCookie(res, refreshToken);
    res.json({ user, accessToken });
  } catch (e) { next(e); }
}

export async function logout(_req, res) {
  clearRefreshCookie(res);
  res.status(204).end();
}

export async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.userId);
    res.json({ user });
  } catch (e) { next(e); }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    const result = await authService.verifyEmail(token);
    res.json(result);
  } catch (e) { next(e); }
}

export async function resendVerification(req, res, next) {
  try {
    const result = await authService.resendVerification(req.userId);
    res.json(result);
  } catch (e) { next(e); }
}

// ---------------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------------

export async function googleLogin(req, res, next) {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'accessToken required' });
    const { user, accessToken: jwt, refreshToken } = await authService.loginWithGoogle(accessToken);
    setRefreshCookie(res, refreshToken);
    res.json({ user, accessToken: jwt });
  } catch (e) { next(e); }
}

export async function googleLink(req, res, next) {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'accessToken required' });
    const user = await authService.linkGoogleAccount(req.userId, accessToken);
    res.json({ user });
  } catch (e) { next(e); }
}

export async function googleUnlink(req, res, next) {
  try {
    const user = await authService.unlinkGoogleAccount(req.userId);
    res.json({ user });
  } catch (e) { next(e); }
}