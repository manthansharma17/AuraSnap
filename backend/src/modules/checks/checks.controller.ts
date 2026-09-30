import type { Request, Response } from 'express';
import { currentAccount } from '../../middleware/auth.js';
import { parse } from '../../lib/validate.js';
import { CameraIdParams } from '../cameras/cameras.schemas.js';
import { CheckIdParams, IngestChecksBody, ListChecksQuery, TrendQuery, VerificationSchema } from './checks.schemas.js';
import { checkService } from './checks.service.js';

export const checkController = {
  list(req: Request, res: Response): void {
    const { limit } = parse(ListChecksQuery, req.query);
    res.json(checkService.list(currentAccount(req).id, limit));
  },

  summary(req: Request, res: Response): void {
    res.json(checkService.summaryToday(currentAccount(req).id));
  },

  fix(req: Request, res: Response): void {
    const { id } = parse(CheckIdParams, req.params);
    res.json(checkService.fix(currentAccount(req).id, id));
  },

  categories(req: Request, res: Response): void {
    res.json(checkService.categories(currentAccount(req).id));
  },

  trend(req: Request, res: Response): void {
    const { days } = parse(TrendQuery, req.query);
    res.json(checkService.trend(currentAccount(req).id, days));
  },

  ingest(req: Request, res: Response): void {
    const body = parse(IngestChecksBody, req.body);
    const created = checkService.ingest(currentAccount(req).id, Array.isArray(body) ? body : [body]);
    res.status(201).json(Array.isArray(body) ? created : created[0]);
  },

  verifyCamera(req: Request, res: Response): void {
    const { id } = parse(CameraIdParams, req.params);
    const input = parse(VerificationSchema, req.body);
    res.json(checkService.setVerification(currentAccount(req).id, id, input));
  },
};
