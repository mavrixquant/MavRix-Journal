// apps/api/src/services/auth.service.js
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../lib/jwt.js';
import { HttpError } from '../middleware/error.js';
import {
  generateSecureToken,
  VERIFY_TTL_MS,
  RESET_TTL_MS,
} from '../lib/tokens.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/mailer.js';
import { verifyGoogleAccessToken } from '../lib/google.js';
import { invalidateSvCache } from '../lib/session.js';

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  emailVerified: u.emailVerified,
  photoUrl: u.photoUrl,
  hasGoogle: !!u.googleId,
  role: u.role || 'user',
  isBanned: !!u.isBanned,
});

// Tokens carry three role-aware claims:
//   sub  — user id (unchanged)
//   role — 'user' | 'admin' | 'superadmin' (read by requireAdmin)
//   sv   — snapshot of user.tokenVersion (checked by requireAuth against DB)
const issueTokens = (user) => {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role || 'user',
    sv: user.tokenVersion ?? 0,
  };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};

function assertNotBanned(user) {
  if (user.isBanned) {
    const reason = user.bannedReason ? `: ${user.bannedReason}` : '';
    throw new HttpError(403, `Account suspended${reason}`);
  }
}

// ---------------------------------------------------------------------------
// Signup / login / refresh / me
// ---------------------------------------------------------------------------

export async function signup({ email, password, firstName, lastName }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, 'Email already registered');

  const passwordHash = await hashPassword(password);
  const verifyToken = generateSecureToken();
  const verifyTokenExpiry = new Date(Date.now() + VERIFY_TTL_MS);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      verifyToken,
      verifyTokenExpiry,
    },
  });

  await sendVerificationEmail({ to: user.email, token: verifyToken });

  return { user: publicUser(user), ...issueTokens(user) };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw new HttpError(401, 'Invalid email or password');
  }

  assertNotBanned(user);

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Invalid email or password');

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { user: publicUser(updated), ...issueTokens(updated) };
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  return publicUser(user);
}

export async function verifyEmail(token) {
  const user = await prisma.user.findUnique({ where: { verifyToken: token } });
  if (!user) throw new HttpError(400, 'Invalid verification token');
  if (user.verifyTokenExpiry && user.verifyTokenExpiry < new Date()) {
    throw new HttpError(400, 'Verification token expired');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null, verifyTokenExpiry: null },
  });

  return { ok: true };
}

export async function resendVerification(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  if (user.emailVerified) throw new HttpError(400, 'Email already verified');

  const verifyToken = generateSecureToken();
  const verifyTokenExpiry = new Date(Date.now() + VERIFY_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: { verifyToken, verifyTokenExpiry },
  });

  await sendVerificationEmail({ to: user.email, token: verifyToken });
  return { ok: true };
}

export async function refresh(refreshToken) {
  if (!refreshToken) throw new HttpError(401, 'Missing refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, 'Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new HttpError(401, 'User no longer exists');

  assertNotBanned(user);

  // The refresh token's `sv` is a snapshot. If the DB value has moved on
  // (force-logout, password reset, admin demotion), the token is dead.
  const tokenSv = Number.isFinite(payload.sv) ? payload.sv : 0;
  if (tokenSv !== user.tokenVersion) {
    throw new HttpError(401, 'Session revoked');
  }

  return { user: publicUser(user), ...issueTokens(user) };
}

// ---------------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------------

export async function loginWithGoogle(accessToken) {
  const g = await verifyGoogleAccessToken(accessToken);

  // Case 1: existing user with this googleId
  const byGoogle = await prisma.user.findUnique({
    where: { googleId: g.googleId },
  });
  if (byGoogle) {
    assertNotBanned(byGoogle);
    const updated = await prisma.user.update({
      where: { id: byGoogle.id },
      data: { lastLoginAt: new Date() },
    });
    return { user: publicUser(updated), ...issueTokens(updated) };
  }

  // Case 2: existing user with this email (created via password signup)
  const byEmail = await prisma.user.findUnique({ where: { email: g.email } });
  if (byEmail) {
    assertNotBanned(byEmail);
    if (!byEmail.emailVerified) {
      throw new HttpError(
        409,
        'An account with this email already exists and is not verified. Verify it first or log in with your password.'
      );
    }
    const linked = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId: g.googleId,
        photoUrl: byEmail.photoUrl || g.photoUrl,
        lastLoginAt: new Date(),
      },
    });
    return { user: publicUser(linked), ...issueTokens(linked) };
  }

  // Case 3: brand new user, Google-verified email
  const created = await prisma.user.create({
    data: {
      email: g.email,
      googleId: g.googleId,
      firstName: g.firstName,
      lastName: g.lastName,
      photoUrl: g.photoUrl,
      emailVerified: true,
      passwordHash: null,
      lastLoginAt: new Date(),
    },
  });
  return { user: publicUser(created), ...issueTokens(created) };
}

export async function linkGoogleAccount(userId, accessToken) {
  const g = await verifyGoogleAccessToken(accessToken);

  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) throw new HttpError(404, 'User not found');

  if (me.googleId === g.googleId) {
    return publicUser(me); // idempotent
  }

  const clash = await prisma.user.findUnique({
    where: { googleId: g.googleId },
  });
  if (clash && clash.id !== userId) {
    throw new HttpError(409, 'This Google account is already linked to another user');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      googleId: g.googleId,
      photoUrl: me.photoUrl || g.photoUrl,
    },
  });
  return publicUser(updated);
}

export async function unlinkGoogleAccount(userId) {
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) throw new HttpError(404, 'User not found');

  if (!me.googleId) return publicUser(me); // idempotent

  if (!me.passwordHash) {
    throw new HttpError(
      400,
      'Set a password before unlinking Google, otherwise you would be locked out'
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { googleId: null },
  });
  return publicUser(updated);
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success even if the email doesn't exist,
  // to prevent account enumeration.
  if (!user) return { ok: true };

  const resetToken = generateSecureToken();
  const resetTokenExpiry = new Date(Date.now() + RESET_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiry },
  });

  await sendPasswordResetEmail({ to: user.email, token: resetToken });
  return { ok: true };
}

export async function resetPassword(token, newPassword) {
  if (!token || !newPassword) {
    throw new HttpError(400, 'Token and new password are required');
  }
  if (newPassword.length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters');
  }

  const user = await prisma.user.findUnique({ where: { resetToken: token } });
  if (!user) throw new HttpError(400, 'Invalid reset token');
  if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
    throw new HttpError(400, 'Reset token expired');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
      // Password change kills every existing session.
      tokenVersion: { increment: 1 },
    },
  });

  invalidateSvCache(user.id);

  return { ok: true };
}