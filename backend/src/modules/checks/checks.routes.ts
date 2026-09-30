import { Router } from 'express';
import { checkController } from './checks.controller.js';

export const checkRoutes = Router();
checkRoutes.get('/', checkController.list);
checkRoutes.get('/summary', checkController.summary);
checkRoutes.post('/:id/fix', checkController.fix);

/** Used by the camera analyzer with an X-Ingest-Key, not by the dashboard. */
export const ingestRoutes = Router();
ingestRoutes.post('/checks', checkController.ingest);
ingestRoutes.put('/cameras/:id/verification', checkController.verifyCamera);
