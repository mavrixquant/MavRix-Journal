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
  generateOtp,
  VERIFY_TTL_MS,
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
} from '../lib/tokens.js';
import {
  sendVerificationEmail,
  sendPasswordResetOtpEmail,
} from '../lib/mailer.js';
import { verifyGoogleAccessToken } from '../lib/google.js';
import { invalidateSvCache } from '../lib/session.js';
import { ensureAiDmForUser } from './maveAiBootstrap.js';
import { signTwoFactorSession } from '../lib/jwt.js';
import { enabledMethods } from './twoFactor.service.js';
import { env } from '../config/env.js';

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  username: u.username ?? null,
  firstName: u.firstName,
  lastName: u.lastName,
  emailVerified: u.emailVerified,
  photoUrl: u.photoUrl,
  hasGoogle: !!u.googleId,
  role: u.role || 'user',
  isBanned: !!u.isBanned,
  hasPassword: !!u.passwordHash,
  twoFactorEnabled: !!u.twoFactorEnabled,
  usernameChangedAt: u.usernameChangedAt ? u.usernameChangedAt.toISOString() : null,
});

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

function assertNotAi(user) {
  if (user.isAi || user.role === 'ai') {
    throw new HttpError(403, 'This account is reserved.');
  }
}

function scheduleAiDmForUser(userId) {
  ensureAiDmForUser(userId).catch((err) => {
    console.warn(
      `[mave-ai] failed to ensure DM for new user ${userId}:`,
      err?.message || err
    );
  });
}

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

  scheduleAiDmForUser(user.id);

  return { user: publicUser(user), ...issueTokens(user) };
}

export async function login({ identifier, password }) {
  const id = String(identifier || '').trim().toLowerCase();
  if (!id) throw new HttpError(400, 'Email or username is required');
  const user = id.includes('@')
    ? await prisma.user.findUnique({ where: { email: id } })
    : await prisma.user.findUnique({ where: { username: id } });
  if (!user || !user.passwordHash) {
    throw new HttpError(401, 'Invalid credentials');
  }

  assertNotBanned(user);
  assertNotAi(user);

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Invalid credentials');

  // 2FA gate — short-circuit before issuing real tokens.
  if (user.twoFactorEnabled) {
    const sessionToken = signTwoFactorSession({
      sub: user.id,
      purpose: '2fa',
      sv: user.tokenVersion ?? 0,
    });
    return {
      requiresTwoFactor: true,
      sessionToken,
      methods: enabledMethods(user),
      reason: 'login',
    };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  scheduleAiDmForUser(updated.id);

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
  assertNotAi(user);

  const tokenSv = Number.isFinite(payload.sv) ? payload.sv : 0;
  if (tokenSv !== user.tokenVersion) {
    throw new HttpError(401, 'Session revoked');
  }

  // 12-hour re-auth — same short-circuit as login().
  if (user.twoFactorEnabled) {
    const hoursSince = user.twoFactorVerifiedAt
      ? (Date.now() - user.twoFactorVerifiedAt.getTime()) / (60 * 60 * 1000)
      : Infinity;

    if (hoursSince >= env.twoFactor.reauthHours) {
      const sessionToken = signTwoFactorSession({
        sub: user.id,
        purpose: '2fa',
        sv: user.tokenVersion ?? 0,
      });
      return {
        requiresTwoFactor: true,
        sessionToken,
        methods: enabledMethods(user),
        reason: 'reauth',
      };
    }
  }

  return { user: publicUser(user), ...issueTokens(user) };
}

export async function loginWithGoogle(accessToken) {
  const g = await verifyGoogleAccessToken(accessToken);

  const byGoogle = await prisma.user.findUnique({
    where: { googleId: g.googleId },
  });
  if (byGoogle) {
    assertNotAi(byGoogle);
    assertNotBanned(byGoogle);

    if (byGoogle.twoFactorEnabled) {
      const sessionToken = signTwoFactorSession({
        sub: byGoogle.id,
        purpose: '2fa',
        sv: byGoogle.tokenVersion ?? 0,
      });
      return {
        requiresTwoFactor: true,
        sessionToken,
        methods: enabledMethods(byGoogle),
        reason: 'login',
      };
    }

    const updated = await prisma.user.update({
      where: { id: byGoogle.id },
      data: { lastLoginAt: new Date() },
    });
    scheduleAiDmForUser(updated.id);
    return { user: publicUser(updated), ...issueTokens(updated) };
  }

  const byEmail = await prisma.user.findUnique({ where: { email: g.email } });
  if (byEmail) {
    assertNotAi(byEmail);
    assertNotBanned(byEmail);
    if (!byEmail.emailVerified) {
      throw new HttpError(
        409,
        'An account with this email already exists and is not verified. Verify it first or log in with your password.'
      );
    }

    if (byEmail.twoFactorEnabled) {
      const sessionToken = signTwoFactorSession({
        sub: byEmail.id,
        purpose: '2fa',
        sv: byEmail.tokenVersion ?? 0,
      });
      return {
        requiresTwoFactor: true,
        sessionToken,
        methods: enabledMethods(byEmail),
        reason: 'login',
      };
    }

    const linked = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId: g.googleId,
        photoUrl: byEmail.photoUrl || g.photoUrl,
        lastLoginAt: new Date(),
      },
    });
    scheduleAiDmForUser(linked.id);
    return { user: publicUser(linked), ...issueTokens(linked) };
  }

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

  scheduleAiDmForUser(created.id);

  return { user: publicUser(created), ...issueTokens(created) };
}

export async function linkGoogleAccount(userId, accessToken) {
  const g = await verifyGoogleAccessToken(accessToken);

  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) throw new HttpError(404, 'User not found');

  if (me.googleId === g.googleId) {
    return publicUser(me);
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

  if (!me.googleId) return publicUser(me);

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

export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return { ok: true };
  if (user.isAi) return { ok: true };

  const otp = generateOtp();
  const resetTokenExpiry = new Date(Date.now() + OTP_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: otp, resetTokenExpiry, resetOtpAttempts: 0 },
  });

  await sendPasswordResetOtpEmail({ to: user.email, otp });
  return { ok: true };
}

export async function verifyResetOtp(email, otp) {
  const id = String(email || '').trim().toLowerCase();
  const code = String(otp || '').trim();
  if (!id || !/^\d{6}$/.test(code)) {
    throw new HttpError(400, 'Invalid or expired code');
  }

  const user = await prisma.user.findUnique({ where: { email: id } });
  if (!user || user.isAi) throw new HttpError(400, 'Invalid or expired code');
  if (!user.resetToken || !user.resetTokenExpiry) {
    throw new HttpError(400, 'Invalid or expired code');
  }
  if (user.resetTokenExpiry < new Date()) {
    throw new HttpError(400, 'Code expired. Request a new one.');
  }
  if ((user.resetOtpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    throw new HttpError(429, 'Too many attempts. Request a new code.');
  }
  if (user.resetToken !== code) {
    await prisma.user.update({
      where: { id: user.id },
      data: { resetOtpAttempts: { increment: 1 } },
    });
    throw new HttpError(401, 'Incorrect code');
  }

  return { ok: true };
}

export async function confirmPasswordReset(email, otp, newPassword) {
  if (!newPassword || String(newPassword).length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters');
  }

  const id = String(email || '').trim().toLowerCase();
  const code = String(otp || '').trim();
  if (!id || !/^\d{6}$/.test(code)) {
    throw new HttpError(400, 'Invalid or expired code');
  }

  const user = await prisma.user.findUnique({ where: { email: id } });
  if (!user || user.isAi) throw new HttpError(400, 'Invalid or expired code');
  if (!user.resetToken || !user.resetTokenExpiry) {
    throw new HttpError(400, 'Invalid or expired code');
  }
  if (user.resetTokenExpiry < new Date()) {
    throw new HttpError(400, 'Code expired. Request a new one.');
  }
  if ((user.resetOtpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    throw new HttpError(429, 'Too many attempts. Request a new code.');
  }
  if (user.resetToken !== code) {
    await prisma.user.update({
      where: { id: user.id },
      data: { resetOtpAttempts: { increment: 1 } },
    });
    throw new HttpError(401, 'Incorrect code');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
      resetOtpAttempts: 0,
      tokenVersion: { increment: 1 },
    },
  });
  invalidateSvCache(user.id);

  return { ok: true };
}

export async function setUsername(userId, username) {
  const clean = String(username || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
    throw new HttpError(
      400,
      'Username must be 3-30 characters and contain only lowercase letters, digits, or underscores'
    );
  }
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, isAi: true },
  });
  if (!existing) throw new HttpError(404, 'User not found');
  if (existing.isAi) throw new HttpError(403, 'Cannot modify AI accounts');
  if (existing.username) {
    throw new HttpError(
      409,
      'Username already set. Use the profile update endpoint to change it.'
    );
  }
  const clash = await prisma.user.findUnique({ where: { username: clean } });
  if (clash && clash.id !== userId) {
    throw new HttpError(409, 'That username is already taken');
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { username: clean },
  });
  return publicUser(user);
}


// ---------------------------------------------------------------------------
// Password management (Set / Change).
//
// setPassword    — only allowed if the user has NO password yet (Google signup).
// changePassword — requires verifying the current password first.
//
// Both bump tokenVersion so every existing refresh token becomes invalid;
// we return FRESH tokens so the CALLING session stays logged in.
// ---------------------------------------------------------------------------

export async function setPassword(userId, newPassword) {
  if (!newPassword || String(newPassword).length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  if (user.isAi) throw new HttpError(403, 'Cannot set password for AI accounts');
  if (user.passwordHash) {
    throw new HttpError(409, 'Password already set. Use change-password instead.');
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
  invalidateSvCache(userId);

  return { user: publicUser(updated), ...issueTokens(updated) };
}

export async function changePassword(userId, oldPassword, newPassword) {
  if (!newPassword || String(newPassword).length < 6) {
    throw new HttpError(400, 'New password must be at least 6 characters');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  if (user.isAi) throw new HttpError(403, 'Cannot change password for AI accounts');
  if (!user.passwordHash) {
    throw new HttpError(400, 'No password set. Use set-password instead.');
  }

  const ok = await verifyPassword(oldPassword, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Current password is incorrect');

  const passwordHash = await hashPassword(newPassword);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
  invalidateSvCache(userId);

  return { user: publicUser(updated), ...issueTokens(updated) };
}
// ---------------------------------------------------------------------------
// updateProfile — edit firstName, lastName, and username.
// Username changes are throttled to once every 3 days via usernameChangedAt.
// setUsername (initial setup) does NOT stamp the cooldown — the first change
// from Settings is free.
// ---------------------------------------------------------------------------

const USERNAME_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

export async function updateProfile(userId, { firstName, lastName, username }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  if (user.isAi) throw new HttpError(403, 'Cannot modify AI accounts');

  const data = {};

  if (firstName !== undefined) {
    const clean = String(firstName).trim();
    if (!clean) throw new HttpError(400, 'First name cannot be empty');
    data.firstName = clean.slice(0, 60);
  }

  if (lastName !== undefined) {
    const clean = String(lastName).trim();
    if (!clean) throw new HttpError(400, 'Last name cannot be empty');
    data.lastName = clean.slice(0, 60);
  }

  if (username !== undefined) {
    const clean = String(username).trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
      throw new HttpError(400, 'Username must be 3-30 characters: a-z, 0-9, _');
    }

    if (clean !== user.username) {
      if (user.usernameChangedAt) {
        const since = Date.now() - user.usernameChangedAt.getTime();
        if (since < USERNAME_COOLDOWN_MS) {
          const remainingMs = USERNAME_COOLDOWN_MS - since;
          const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
          throw new HttpError(
            429,
            `Username can only be changed once every 3 days. Try again in ${days} day(s).`
          );
        }
      }

      const clash = await prisma.user.findUnique({ where: { username: clean } });
      if (clash && clash.id !== userId) {
        throw new HttpError(409, 'That username is already taken');
      }

      data.username = clean;
      data.usernameChangedAt = new Date();
    }
  }

  if (Object.keys(data).length === 0) return publicUser(user);

  const updated = await prisma.user.update({ where: { id: userId }, data });
  return publicUser(updated);
}