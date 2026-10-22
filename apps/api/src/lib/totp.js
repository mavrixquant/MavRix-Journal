// ============================================================================
// TOTP + backup code helpers.
// ============================================================================

import crypto from 'node:crypto';
import { authenticator } from 'otplib';
import { env } from '../config/env.js';

authenticator.options = { window: 1, step: 30 };

export function generateTotpSecret() {
  return authenticator.generateSecret(); // base32
}

export function verifyTotp(secret, token) {
  const clean = String(token || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean)) return false;
  try {
    return authenticator.verify({ token: clean, secret });
  } catch {
    return false;
  }
}

export function buildOtpauthUri(secret, accountLabel) {
  return authenticator.keyuri(accountLabel, env.twoFactor.issuer, secret);
}

// 10 backup codes in "A1B2C-3D4E5" shape — 10 hex chars grouped 5-5.
export function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
    codes.push(raw.match(/.{1,5}/g).join('-'));
  }
  return codes;
}