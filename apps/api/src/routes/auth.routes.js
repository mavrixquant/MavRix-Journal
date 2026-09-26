import { Router } from 'express';
import { signupSchema, loginSchema } from '@mavrix/shared/validators';
import { requireAuth } from '../middleware/auth.js';
import * as authController from '../controllers/auth.controller.js';

export const authRoutes = Router();

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
authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', requireAuth, authController.me);
authRoutes.post('/verify-email', authController.verifyEmail);
authRoutes.post('/resend-verification', requireAuth, authController.resendVerification);
authRoutes.post('/google', authController.googleLogin);
authRoutes.post('/google/link', requireAuth, authController.googleLink);
authRoutes.post('/google/unlink', requireAuth, authController.googleUnlink);
authRoutes.post('/request-password-reset', authController.requestPasswordReset);
authRoutes.post('/reset-password', authController.resetPassword);