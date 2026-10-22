// ============================================================================
// AES-256-GCM helpers for the TOTP secret at rest.
// Mirrors lib/ai/crypto.js but with its own env key so rotating one never
// affects the other.
// ============================================================================

import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getMasterKeyBuffer() {
  const hex = env.twoFactor.encryptionKey;
  if (!hex) {
    throw new Error(
      '[2fa] TWO_FACTOR_ENCRYPTION_KEY is not set. TOTP cannot be stored or read.'
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      '[2fa] TWO_FACTOR_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).'
    );
  }
  return Buffer.from(hex, 'hex');
}

export function encryptSecret(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Cannot encrypt empty TOTP secret');
  }
  const key = getMasterKeyBuffer();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

export function decryptSecret({ encrypted, iv, tag }) {
  if (!encrypted || !iv || !tag) {
    throw new Error('Cannot decrypt — missing ciphertext, IV, or tag');
  }
  const key = getMasterKeyBuffer();
  const ivBuf = Buffer.from(iv, 'hex');
  const tagBuf = Buffer.from(tag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuf);
  decipher.setAuthTag(tagBuf);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}