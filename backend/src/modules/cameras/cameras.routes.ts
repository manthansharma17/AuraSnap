import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { cameraController } from './cameras.controller.js';

const networkTestLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, error: 'Too many connection tests. Please wait a minute.', code: 'RATE_LIMITED', details: [] },
});

export const cameraRoutes = Router();
cameraRoutes.get('/', cameraController.list);
cameraRoutes.put('/:id', cameraController.update);

export const networkRoutes = Router();
networkRoutes.post('/test', networkTestLimiter, cameraController.testNetwork);
