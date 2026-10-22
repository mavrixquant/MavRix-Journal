-- ---------------------------------------------------------------------------
-- OTP-based password reset.
--
-- Before: password reset generated a 64-char hex token embedded in a URL
--         (unique per user).
-- After:  password reset generates a 6-digit OTP typed manually by the
--         user. Two users can theoretically collide on the same OTP, so
--         the UNIQUE constraint on resetToken must be dropped. Lookups
--         are always by email first, then compared against resetToken.
--
-- The resetToken / resetTokenExpiry columns are repurposed (shape is the
-- same, semantics change: 6-digit string, 10-minute expiry). A new
-- resetOtpAttempts counter caps brute-force attempts at 5 per OTP.
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS "users_resetToken_key";

ALTER TABLE "users"
  ADD COLUMN "resetOtpAttempts" INTEGER NOT NULL DEFAULT 0;