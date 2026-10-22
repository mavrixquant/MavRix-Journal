import { Router } from 'express';
import {
  signupSchema,
  loginSchema,
  setUsernameSchema,
  setPasswordSchema,
  changePasswordSchema,
} from '@mavrix/shared/validators';
import { verifyResetOtpSchema, confirmPasswordResetSchema } from '@mavrix/shared/validators';
import { requireAuth } from '../middleware/auth.js';
import * as authController from '../controllers/auth.controller.js';
import { rateLimit } from '../lib/rateLimit.js';

export const authRoutes = Router();

const resetRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Try again in an hour.',
});

const validate = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (e) {
    next(e);
  }
};

authRoutes.post('/signup', validate(signupSchema), authController.signup);
authRoutes.post('/login', validate(loginSchema), authController.login);
authRoutes.post('/set-username', requireAuth, validate(setUsernameSchema), authController.setUsername);
authRoutes.post('/set-password', requireAuth, validate(setPasswordSchema), authController.setPassword);
authRoutes.post('/change-password', requireAuth, validate(changePasswordSchema), authController.changePassword);
authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', requireAuth, authController.me);
authRoutes.post('/verify-email', authController.verifyEmail);
authRoutes.post('/resend-verification', requireAuth, authController.resendVerification);
authRoutes.post('/google', authController.googleLogin);
authRoutes.post('/google/link', requireAuth, authController.googleLink);
authRoutes.post('/google/unlink', requireAuth, authController.googleUnlink);
authRoutes.post('/request-password-reset', resetRequestLimiter, authController.requestPasswordReset);
authRoutes.post('/verify-reset-otp', validate(verifyResetOtpSchema), authController.verifyResetOtp);
authRoutes.post('/reset-password', validate(confirmPasswordResetSchema), authController.resetPassword);