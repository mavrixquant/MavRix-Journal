import { Router } from 'express';
import {
  signupSchema,
  loginSchema,
  setUsernameSchema,
  setPasswordSchema,
  changePasswordSchema,
} from '@mavrix/shared/validators';
import { verifyResetOtpSchema, confirmPasswordResetSchema, updateProfileSchema } from '@mavrix/shared/validators';
import { requireAuth } from '../middleware/auth.js';
import * as authController from '../controllers/auth.controller.js';
import { rateLimit } from '../lib/rateLimit.js';
import * as twoFactorController from '../controllers/twoFactor.controller.js';

export const authRoutes = Router();

// FIXED 2026-11-18 — core auth endpoints were previously unauthenticated
// against brute force / credential stuffing / account-creation abuse. Each
// sensitive route now carries an IP-based limiter keyed on the request
// source. Identity-aware limits (per-email / per-user) are layered on top
// inside the controllers where the account can be resolved.
const resetRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Try again in an hour.',
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Try again later.',
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many accounts created from this IP.',
});

const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many refresh requests. Slow down.',
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many email requests. Try again in an hour.',
});

const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many Google login attempts. Try again later.',
});

const resetOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many OTP verification attempts. Try again later.',
});

const validate = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (e) {
    next(e);
  }
};

authRoutes.post('/signup', signupLimiter, validate(signupSchema), authController.signup);
authRoutes.post('/login', loginLimiter, validate(loginSchema), authController.login);
authRoutes.post('/set-username', requireAuth, validate(setUsernameSchema), authController.setUsername);
authRoutes.post('/set-password', requireAuth, validate(setPasswordSchema), authController.setPassword);
authRoutes.post('/change-password', requireAuth, validate(changePasswordSchema), authController.changePassword);
authRoutes.patch('/profile', requireAuth, validate(updateProfileSchema), authController.updateProfile);
authRoutes.post('/refresh', refreshLimiter, authController.refresh);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', requireAuth, authController.me);
authRoutes.post('/verify-email', emailLimiter, authController.verifyEmail);
authRoutes.post('/resend-verification', requireAuth, emailLimiter, authController.resendVerification);
authRoutes.post('/google', googleLimiter, authController.googleLogin);
authRoutes.post('/google/link', requireAuth, authController.googleLink);
authRoutes.post('/google/unlink', requireAuth, authController.googleUnlink);
authRoutes.post('/request-password-reset', resetRequestLimiter, authController.requestPasswordReset);
authRoutes.post('/verify-reset-otp', resetOtpLimiter, validate(verifyResetOtpSchema), authController.verifyResetOtp);
authRoutes.post('/reset-password', resetOtpLimiter, validate(confirmPasswordResetSchema), authController.resetPassword);
// ============================================================================
// Two-Factor Authentication
// ============================================================================

const loginOtpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: 'Too many code requests. Try again in a few minutes.',
});

const verifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  message: 'Too many verification attempts. Slow down.',
});

// Public — session-token based (user knows their password, needs 2nd factor)
authRoutes.post('/2fa/verify',     verifyLimiter,    twoFactorController.verifyLogin);
authRoutes.post('/2fa/send-email', loginOtpLimiter, twoFactorController.sendEmailOtp);

// Protected — logged in user managing their 2FA
authRoutes.get ('/2fa/status',      requireAuth, twoFactorController.status);

authRoutes.post('/2fa/totp/setup',   requireAuth, twoFactorController.setupTotp);
authRoutes.post('/2fa/totp/confirm', requireAuth, twoFactorController.confirmTotp);
authRoutes.post('/2fa/totp/disable', requireAuth, twoFactorController.disableTotp);

authRoutes.post('/2fa/email/enable',  requireAuth, loginOtpLimiter, twoFactorController.enableEmail);
authRoutes.post('/2fa/email/confirm', requireAuth, twoFactorController.confirmEmail);
authRoutes.post('/2fa/email/disable', requireAuth, twoFactorController.disableEmail);

authRoutes.post('/2fa/backup-codes/regenerate', requireAuth, twoFactorController.regenerateBackupCodes);