import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { db } from './db/database.js';
import { requireIngestKey, requireUser } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { accountRoutes } from './modules/account/account.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { cameraRoutes, networkRoutes } from './modules/cameras/cameras.routes.js';
import { checkController } from './modules/checks/checks.controller.js';
import { checkRoutes, ingestRoutes } from './modules/checks/checks.routes.js';
import { staffRoutes } from './modules/staff/staff.routes.js';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy ? 1 : false);
  app.set('query parser', 'simple');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Ingest-Key'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '100kb', strict: true }));

  app.use(
    '/streams',
    express.static(config.hlsDir, {
      index: false,
      dotfiles: 'deny',
      setHeaders: (res, filePath) => {
        res.setHeader('Cache-Control', filePath.endsWith('.m3u8') ? 'no-cache' : 'public, max-age=30');
      },
    }),
  );

  const api = Router();
  api.get('/health', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok' });
  });
  api.use('/auth', authRoutes);
  api.use('/ingest', requireIngestKey, ingestRoutes);
  api.use('/account', requireUser, accountRoutes);
  api.get('/categories', requireUser, checkController.categories);
  api.get('/trend', requireUser, checkController.trend);
  api.use('/checks', requireUser, checkRoutes);
  api.use('/cameras', requireUser, cameraRoutes);
  api.use('/network', requireUser, networkRoutes);
  api.use('/staff', requireUser, staffRoutes);

  app.use('/api/v1', api);
  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
