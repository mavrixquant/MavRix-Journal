import { apiJson, setAccessToken } from '@/shared/api/client';

const REFRESH_TIMEOUT_MS = 10_000;

function normalizeUser(u) {
  if (!u) return null;
  const displayName =
    [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
    u.username ||
    u.email ||
    'User';
  const providerData = [];
  if (u.hasGoogle) providerData.push({ providerId: 'google.com' });
  return {
    id: u.id,
    uid: u.id,
    email: u.email,
    username: u.username ?? null,
    hasUsername: !!u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    displayName,
    emailVerified: !!u.emailVerified,
    photoUrl: u.photoUrl ?? null,
    photoURL: u.photoUrl ?? null,
    providerData,
    hasGoogle: !!u.hasGoogle,
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

export async function login({ identifier, password }) {
  const data = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  setAccessToken(data.accessToken);
  return { user: normalizeUser(data.user) };
}

/**
 * Refresh access token using the httpOnly cookie.
 *
 * HARD TIMEOUT: on Render free tier cold starts, the initial request can hang
 * for 30–60 s. Without a timeout the whole app would show a blank screen for
 * that entire duration while `AuthProvider.loading` stays `true`. Ten seconds
 * is long enough for any legitimate response but short enough to fail fast.
 */
export async function refresh() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);

  try {
    const data = await apiJson('/api/auth/refresh', {
      method: 'POST',
      signal: controller.signal,
    });
    setAccessToken(data.accessToken);
    return { user: normalizeUser(data.user) };
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(
        `Auth refresh timed out after ${REFRESH_TIMEOUT_MS / 1000}s`
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
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

export async function setUsername(username) {
  const data = await apiJson('/api/auth/set-username', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
  return normalizeUser(data.user);
}