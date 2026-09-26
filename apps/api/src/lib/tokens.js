import crypto from 'node:crypto';

export const generateSecureToken = () => crypto.randomBytes(32).toString('hex');

export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const RESET_TTL_MS  = 60 * 60 * 1000;       // 1 hour