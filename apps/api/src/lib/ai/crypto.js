
import crypto from 'node:crypto';
import { env } from '../../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getMasterKeyBuffer() {
  const hex = env.ai.masterKey;
  if (!hex) {
    throw new Error(
      '[mave-ai] MAVE_AI_MASTER_KEY is not set. Cannot encrypt or decrypt BYOK credentials.'
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      '[mave-ai] MAVE_AI_MASTER_KEY must be exactly 64 hex characters (32 bytes).'
    );
  }
  return Buffer.from(hex, 'hex');
}

export function encryptKey(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Cannot encrypt empty API key');
  }

  const key = getMasterKeyBuffer();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    encryptedKey: encrypted,
    keyIv: iv.toString('hex'),
    keyTag: tag.toString('hex'),
  };
}

export function decryptKey({ encryptedKey, keyIv, keyTag }) {
  if (!encryptedKey || !keyIv || !keyTag) {
    throw new Error('Cannot decrypt — missing ciphertext, IV, or tag');
  }

  const key = getMasterKeyBuffer();
  const iv = Buffer.from(keyIv, 'hex');
  const tag = Buffer.from(keyTag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}