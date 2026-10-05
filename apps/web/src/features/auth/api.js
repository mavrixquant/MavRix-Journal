// apps/web/src/features/auth/api.js
import { apiJson, setAccessToken } from '@/shared/api/client';

// Normalize our API's user shape into a Firebase-compatible shape
// so existing consumers don't need to change.
function normalizeUser(u) {
  if (!u) return null;
  const displayName =
    [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
    u.email ||
    'User';
  const providerData = [];
  if (u.hasGoogle) providerData.push({ providerId: 'google.com' });
  return {
    id: u.id,
    uid: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    displayName,
    emailVerified: !!u.emailVerified,
    photoUrl: u.photoUrl ?? null,
    photoURL: u.photoUrl ?? null,
    providerData,
    hasGoogle: !!u.hasGoogle,
    // ─── admin extension ─────────────────────────────────────────────
    // Exposed so guards.jsx and HeaderBar can branch without a second
    // /me call. Values: 'user' | 'admin' | 'superadmin'.
    role: u.role || 'user',
    isBanned: !!u.isBanned,
  };
}

export async function signup({ email, password, firstName, lastName }) {
  const data = await apiJson('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, firstName, lastName }),
  });
  setAccessToken(data.accessToken);
  return { user: normalizeUser(data.user) };
}

export async function login({ email, password }) {
  const data = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(data.accessToken);
  return { user: normalizeUser(data.user) };
}

export async function refresh() {
  const data = await apiJson('/api/auth/refresh', { method: 'POST' });
  setAccessToken(data.accessToken);
  return { user: normalizeUser(data.user) };
}

export async function logout() {
  try {
    await apiJson('/api/auth/logout', { method: 'POST' });
  } finally {
    setAccessToken(null);
  }
}

export async function fetchMe() {
  const data = await apiJson('/api/auth/me');
  return normalizeUser(data.user);
}

export async function verifyEmail(token) {
  return apiJson('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function resendVerification() {
  return apiJson('/api/auth/resend-verification', { method: 'POST' });
}

export { normalizeUser };

// ---------------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------------

export async function googleLogin(googleAccessToken) {
  const data = await apiJson('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ accessToken: googleAccessToken }),
  });
  setAccessToken(data.accessToken);
  return { user: normalizeUser(data.user) };
}

export async function linkGoogle(googleAccessToken) {
  const data = await apiJson('/api/auth/google/link', {
    method: 'POST',
    body: JSON.stringify({ accessToken: googleAccessToken }),
  });
  return normalizeUser(data.user);
}

export async function unlinkGoogle() {
  const data = await apiJson('/api/auth/google/unlink', { method: 'POST' });
  return normalizeUser(data.user);
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function requestPasswordReset(email) {
  return apiJson('/api/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token, password) {
  return apiJson('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}