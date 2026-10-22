// ============================================================================
// Two-Factor Authentication — email OTP + TOTP + backup codes.
//
// Flow summary:
//   login()        → if enabled, returns { requiresTwoFactor, sessionToken, methods }
//   verify()       → sessionToken + method + code → real access + refresh tokens
//   refresh()      → if twoFactorVerifiedAt older than REAUTH_HOURS, same short-circuit
//   setup TOTP     → pending secret stored encrypted → QR → confirm → enable + backup codes
//   setup email    → OTP sent → confirm → enable
// ============================================================================

import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { env } from '../config/env.js';
import { encryptSecret, decryptSecret } from '../lib/twoFactorCrypto.js';
import {
  generateTotpSecret,
  verifyTotp,
  buildOtpauthUri,
  generateBackupCodes,
} from '../lib/totp.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  signTwoFactorSession,
  verifyTwoFactorSession,
  signAccessToken,
  signRefreshToken,
} from '../lib/jwt.js';
import { sendTwoFactorOtpEmail } from '../lib/mailer.js';
import { invalidateSvCache } from '../lib/session.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function numericOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function hashAll(codes) {
  return Promise.all(codes.map((c) => hashPassword(c)));
}

function enabledMethods(user) {
  const methods = [];
  if (user.twoFactorTotpEnabled) methods.push('totp');
  if (user.twoFactorEmailEnabled) methods.push('email');
  return methods;
}

function issueSessionFor(user) {
  return signTwoFactorSession({
    sub: user.id,
    purpose: '2fa',
    sv: user.tokenVersion ?? 0,
  });
}

function decodeSession(token) {
  let payload;
  try {
    payload = verifyTwoFactorSession(token);
  } catch {
    throw new HttpError(401, 'Invalid or expired 2FA session');
  }
  if (payload.purpose !== '2fa' || !payload.sub) {
    throw new HttpError(401, 'Invalid 2FA session');
  }
  return payload;
}

async function tryTotpOrBackup(user, code) {
  const clean = String(code || '').trim();

  if (user.totpSecret && user.totpSecretIv && user.totpSecretTag) {
    try {
      const secret = decryptSecret({
        encrypted: user.totpSecret,
        iv: user.totpSecretIv,
        tag: user.totpSecretTag,
      });
      if (verifyTotp(secret, clean)) return true;
    } catch (err) {
      console.warn('[2fa] TOTP decrypt failed:', err.message);
    }
  }

  const hashes = Array.isArray(user.totpBackupCodes) ? user.totpBackupCodes : [];
  for (let i = 0; i < hashes.length; i++) {
    if (await verifyPassword(clean, hashes[i])) {
      const remaining = hashes.filter((_, idx) => idx !== i);
      await prisma.user.update({
        where: { id: user.id },
        data: { totpBackupCodes: remaining },
      });
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export async function getStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorEnabled: true,
      twoFactorEmailEnabled: true,
      twoFactorTotpEnabled: true,
      totpBackupCodes: true,
      twoFactorVerifiedAt: true,
    },
  });
  if (!user) throw new HttpError(404, 'User not found');

  const backupCodes = Array.isArray(user.totpBackupCodes) ? user.totpBackupCodes : [];

  return {
    enabled: user.twoFactorEnabled,
    emailEnabled: user.twoFactorEmailEnabled,
    totpEnabled: user.twoFactorTotpEnabled,
    backupCodesRemaining: backupCodes.length,
    verifiedAt: user.twoFactorVerifiedAt,
    reauthHours: env.twoFactor.reauthHours,
  };
}

// ---------------------------------------------------------------------------
// TOTP setup
// ---------------------------------------------------------------------------

export async function setupTotp(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  if (user.isAi) throw new HttpError(403, 'AI accounts cannot enable 2FA');

  const secret = generateTotpSecret();
  const { encrypted, iv, tag } = encryptSecret(secret);

  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingTotpSecret: encrypted,
      pendingTotpSecretIv: iv,
      pendingTotpSecretTag: tag,
    },
  });

  const otpauth = buildOtpauthUri(secret, user.email);
  const qrDataUrl = await QRCode.toDataURL(otpauth, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  return { secret, otpauth, qrDataUrl };
}

export async function confirmTotp(userId, { code }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  if (!user.pendingTotpSecret || !user.pendingTotpSecretIv || !user.pendingTotpSecretTag) {
    throw new HttpError(400, 'No pending TOTP setup. Start setup again.');
  }

  const secret = decryptSecret({
    encrypted: user.pendingTotpSecret,
    iv: user.pendingTotpSecretIv,
    tag: user.pendingTotpSecretTag,
  });

  if (!verifyTotp(secret, code)) {
    throw new HttpError(401, 'Incorrect code — check your authenticator app');
  }

  const plainCodes = generateBackupCodes(env.twoFactor.backupCodeCount);
  const hashed = await hashAll(plainCodes);

  await prisma.user.update({
    where: { id: userId },
    data: {
      totpSecret: user.pendingTotpSecret,
      totpSecretIv: user.pendingTotpSecretIv,
      totpSecretTag: user.pendingTotpSecretTag,
      pendingTotpSecret: null,
      pendingTotpSecretIv: null,
      pendingTotpSecretTag: null,
      totpBackupCodes: hashed,
      twoFactorTotpEnabled: true,
      twoFactorEnabled: true,
      twoFactorVerifiedAt: new Date(),
    },
  });

  return { backupCodes: plainCodes };
}

export async function disableTotp(userId, { password, code }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  if (!user.twoFactorTotpEnabled) throw new HttpError(400, 'Authenticator is not enabled');

  if (user.passwordHash) {
    const ok = await verifyPassword(password || '', user.passwordHash);
    if (!ok) throw new HttpError(401, 'Incorrect password');
  }

  if (!(await tryTotpOrBackup(user, code))) {
    throw new HttpError(401, 'Incorrect code');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      totpSecret: null,
      totpSecretIv: null,
      totpSecretTag: null,
      totpBackupCodes: [],
      twoFactorTotpEnabled: false,
      twoFactorEnabled: user.twoFactorEmailEnabled,
    },
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Email setup
// ---------------------------------------------------------------------------

export async function enableEmail(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  if (user.isAi) throw new HttpError(403, 'AI accounts cannot enable 2FA');

  const otp = numericOtp();
  const hash = await hashPassword(otp);
  const expiry = new Date(Date.now() + env.twoFactor.otpTtlMs);

  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingEmailOtp: hash,
      pendingEmailOtpExpiry: expiry,
      pendingEmailOtpAttempts: 0,
    },
  });

  await sendTwoFactorOtpEmail({ to: user.email, otp, minutes: 10 });
  return { ok: true };
}

export async function confirmEmail(userId, { code }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  if (!user.pendingEmailOtp || !user.pendingEmailOtpExpiry) {
    throw new HttpError(400, 'No pending email code. Request a new one.');
  }
  if (user.pendingEmailOtpExpiry < new Date()) {
    throw new HttpError(400, 'Code expired. Request a new one.');
  }
  if ((user.pendingEmailOtpAttempts ?? 0) >= env.twoFactor.otpMaxAttempts) {
    throw new HttpError(429, 'Too many attempts. Request a new code.');
  }

  const ok = await verifyPassword(code || '', user.pendingEmailOtp);
  if (!ok) {
    await prisma.user.update({
      where: { id: userId },
      data: { pendingEmailOtpAttempts: { increment: 1 } },
    });
    throw new HttpError(401, 'Incorrect code');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingEmailOtp: null,
      pendingEmailOtpExpiry: null,
      pendingEmailOtpAttempts: 0,
      twoFactorEmailEnabled: true,
      twoFactorEnabled: true,
      twoFactorVerifiedAt: new Date(),
    },
  });

  return { ok: true };
}

export async function disableEmail(userId, { password }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  if (!user.twoFactorEmailEnabled) throw new HttpError(400, 'Email 2FA is not enabled');
  if (user.passwordHash) {
    const ok = await verifyPassword(password || '', user.passwordHash);
    if (!ok) throw new HttpError(401, 'Incorrect password');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEmailEnabled: false,
      twoFactorEnabled: user.twoFactorTotpEnabled,
    },
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Login flow
// ---------------------------------------------------------------------------

export async function sendLoginEmailOtp(sessionToken) {
  const payload = decodeSession(sessionToken);
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new HttpError(401, 'User not found');
  if (!user.twoFactorEmailEnabled) throw new HttpError(400, 'Email 2FA not enabled');
  if (user.isBanned) throw new HttpError(403, 'Account suspended');

  const otp = numericOtp();
  const hash = await hashPassword(otp);
  const expiry = new Date(Date.now() + env.twoFactor.otpTtlMs);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pendingEmailOtp: hash,
      pendingEmailOtpExpiry: expiry,
      pendingEmailOtpAttempts: 0,
    },
  });

  await sendTwoFactorOtpEmail({ to: user.email, otp, minutes: 10 });
  return { ok: true };
}

export async function verifyLogin({ sessionToken, method, code }) {
  const payload = decodeSession(sessionToken);
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new HttpError(401, 'User not found');
  if (user.isBanned) throw new HttpError(403, 'Account suspended');
  if (!user.twoFactorEnabled) throw new HttpError(400, '2FA is not enabled for this account');

  const tokenSv = Number.isFinite(payload.sv) ? payload.sv : 0;
  if (tokenSv !== user.tokenVersion) {
    throw new HttpError(401, 'Session revoked');
  }

  if (method === 'totp') {
    if (!user.twoFactorTotpEnabled) throw new HttpError(400, 'Authenticator is not enabled');
    const ok = await tryTotpOrBackup(user, code);
    if (!ok) throw new HttpError(401, 'Incorrect code');
  } else if (method === 'email') {
    if (!user.twoFactorEmailEnabled) throw new HttpError(400, 'Email 2FA is not enabled');
    if (!user.pendingEmailOtp || !user.pendingEmailOtpExpiry) {
      throw new HttpError(400, 'No pending email code. Request a new one.');
    }
    if (user.pendingEmailOtpExpiry < new Date()) {
      throw new HttpError(400, 'Code expired. Request a new one.');
    }
    if ((user.pendingEmailOtpAttempts ?? 0) >= env.twoFactor.otpMaxAttempts) {
      throw new HttpError(429, 'Too many attempts. Request a new code.');
    }
    const ok = await verifyPassword(code || '', user.pendingEmailOtp);
    if (!ok) {
      await prisma.user.update({
        where: { id: user.id },
        data: { pendingEmailOtpAttempts: { increment: 1 } },
      });
      throw new HttpError(401, 'Incorrect code');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pendingEmailOtp: null,
        pendingEmailOtpExpiry: null,
        pendingEmailOtpAttempts: 0,
      },
    });
  } else {
    throw new HttpError(400, 'Invalid method. Use "totp" or "email".');
  }

  const fresh = await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorVerifiedAt: new Date(),
      lastLoginAt: new Date(),
    },
  });

  const tokenPayload = {
    sub: fresh.id,
    email: fresh.email,
    role: fresh.role || 'user',
    sv: fresh.tokenVersion ?? 0,
  };

  return {
    user: fresh,
    accessToken: signAccessToken(tokenPayload),
    refreshToken: signRefreshToken(tokenPayload),
  };
}

// ---------------------------------------------------------------------------
// Backup codes
// ---------------------------------------------------------------------------

export async function regenerateBackupCodes(userId, { password, code }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  if (!user.twoFactorTotpEnabled) throw new HttpError(400, 'Authenticator is not enabled');

  if (user.passwordHash) {
    const ok = await verifyPassword(password || '', user.passwordHash);
    if (!ok) throw new HttpError(401, 'Incorrect password');
  }

  const clean = String(code || '').trim();
  let totpOk = false;
  if (user.totpSecret && user.totpSecretIv && user.totpSecretTag) {
    try {
      const secret = decryptSecret({
        encrypted: user.totpSecret,
        iv: user.totpSecretIv,
        tag: user.totpSecretTag,
      });
      totpOk = verifyTotp(secret, clean);
    } catch { /* ignore */ }
  }
  if (!totpOk) throw new HttpError(401, 'Incorrect authenticator code');

  const plainCodes = generateBackupCodes(env.twoFactor.backupCodeCount);
  const hashed = await hashAll(plainCodes);

  await prisma.user.update({
    where: { id: userId },
    data: { totpBackupCodes: hashed },
  });

  return { backupCodes: plainCodes };
}

// ---------------------------------------------------------------------------
// Exports for auth.service.js
// ---------------------------------------------------------------------------

export { enabledMethods, issueSessionFor };