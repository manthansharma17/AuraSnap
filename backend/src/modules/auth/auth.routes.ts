import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authController } from './auth.controller.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many attempts. Please wait a few minutes and try again.',
    code: 'RATE_LIMITED',
    details: [],
  },
});

export const authRoutes = Router();
authRoutes.post('/register', authLimiter, authController.register);
authRoutes.post('/login', authLimiter, authController.login);
