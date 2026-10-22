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
    hasPassword: !!u.hasPassword,
    role: u.role || 'user',
    isBanned: !!u.isBanned,
    twoFactorEnabled: !!u.twoFactorEnabled,
    twoFactorEmailEnabled: !!u.twoFactorEmailEnabled,
    twoFactorTotpEnabled: !!u.twoFactorTotpEnabled,
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

  if (data.requiresTwoFactor) {
    return {
      requiresTwoFactor: true,
      sessionToken: data.sessionToken,
      methods: data.methods || [],
      reason: data.reason || 'login',
    };
  }

  setAccessToken(data.accessToken);
  return { user: normalizeUser(data.user) };
}

/**
 * Refresh access token using the httpOnly cookie.
 *
 * HARD TIMEOUT: on Render free tier cold starts, the initial request can hang
 * for 30â€“60 s. Without a timeout the whole app would show a blank screen for
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

    if (data.requiresTwoFactor) {
      return {
        requiresTwoFactor: true,
        sessionToken: data.sessionToken,
        methods: data.methods || [],
        reason: data.reason || 'reauth',
      };
    }

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

  if (data.requiresTwoFactor) {
    return {
      requiresTwoFactor: true,
      sessionToken: data.sessionToken,
      methods: data.methods || [],
      reason: data.reason || 'login',
    };
  }

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

export async function verifyResetOtp(email, otp) {
  return apiJson('/api/auth/verify-reset-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

export async function resetPassword(email, otp, newPassword) {
  return apiJson('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, newPassword }),
  });
}
export async function setUsername(username) {
  const data = await apiJson('/api/auth/set-username', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
  return normalizeUser(data.user);
}


export async function setPassword(password) {
  const data = await apiJson('/api/auth/set-password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  if (data.accessToken) setAccessToken(data.accessToken);
  return normalizeUser(data.user);
}

export async function changePassword(oldPassword, newPassword) {
  const data = await apiJson('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  if (data.accessToken) setAccessToken(data.accessToken);
  return normalizeUser(data.user);
}
// ============================================================================
// Two-Factor Authentication
// ============================================================================

export async function verifyTwoFactor(sessionToken, { method, code }) {
  const data = await apiJson('/api/auth/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ sessionToken, method, code }),
  });
  setAccessToken(data.accessToken);
  return { user: normalizeUser(data.user) };
}

export async function sendTwoFactorEmail(sessionToken) {
  return apiJson('/api/auth/2fa/send-email', {
    method: 'POST',
    body: JSON.stringify({ sessionToken }),
  });
}

export async function getTwoFactorStatus() {
  return apiJson('/api/auth/2fa/status');
}

export async function setupTotp() {
  return apiJson('/api/auth/2fa/totp/setup', { method: 'POST' });
}

export async function confirmTotp(code) {
  return apiJson('/api/auth/2fa/totp/confirm', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function disableTotp(password, code) {
  return apiJson('/api/auth/2fa/totp/disable', {
    method: 'POST',
    body: JSON.stringify({ password, code }),
  });
}

export async function enableEmailTwoFactor() {
  return apiJson('/api/auth/2fa/email/enable', { method: 'POST' });
}

export async function confirmEmailTwoFactor(code) {
  return apiJson('/api/auth/2fa/email/confirm', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function disableEmailTwoFactor(password) {
  return apiJson('/api/auth/2fa/email/disable', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function regenerateBackupCodes(password, code) {
  return apiJson('/api/auth/2fa/backup-codes/regenerate', {
    method: 'POST',
    body: JSON.stringify({ password, code }),
  });
}