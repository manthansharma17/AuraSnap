import { Router, type Request, type Response } from 'express';
import { currentAccount } from '../../middleware/auth.js';
import { notFound } from '../../lib/errors.js';
import { toIso } from '../../lib/time.js';
import { accountRepository } from '../auth/auth.repository.js';
import { authService } from '../auth/auth.service.js';

const accountController = {
  me(req: Request, res: Response): void {
    const account = accountRepository.findById(currentAccount(req).id);
    if (!account) throw notFound('Account not found.');
    res.json({
      name: account.name,
      id: account.loginId,
      hasIngestKey: account.hasIngestKey,
      createdAt: toIso(account.createdAt),
    });
  },

  rotateIngestKey(req: Request, res: Response): void {
    const ingestKey = authService.rotateIngestKey(currentAccount(req).id);
    res.status(201).json({ ingestKey });
  },
};

export const accountRoutes = Router();
accountRoutes.get('/', accountController.me);
accountRoutes.post('/ingest-key', accountController.rotateIngestKey);
