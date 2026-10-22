import crypto from 'node:crypto';

export const generateSecureToken = () => crypto.randomBytes(32).toString('hex');

export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_TTL_MS  = 60 * 60 * 1000;


// ---------------------------------------------------------------------------
// OTP-based password reset.
//
// 6-digit numeric, always padded to 6 chars (crypto.randomInt(100000, 1_000_000)
// cannot produce a leading zero). Expires in 10 minutes; capped at 5 wrong
// attempts per OTP before the user must request a new one.
// ---------------------------------------------------------------------------

export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

export const OTP_TTL_MS        = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS  = 5;