import type { NextFunction, Request, Response } from 'express';
import { forbidden, unauthorized } from '../lib/errors.js';
import { authService } from '../modules/auth/auth.service.js';
import type { AuthAccount } from '../modules/auth/auth.types.js';

/** Restaurant staff using the dashboard: `Authorization: Bearer <jwt>`. */
export function requireUser(req: Request, _res: Response, next: NextFunction): void {
  const header = req.get('authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match?.[1]) throw unauthorized();
  req.account = authService.verifyToken(match[1]);
  req.principal = 'user';
  next();
}

/** The camera analyzer pushing results: `X-Ingest-Key: <key>`. It cannot use dashboard routes. */
export function requireIngestKey(req: Request, _res: Response, next: NextFunction): void {
  const key = req.get('x-ingest-key');
  if (!key) throw unauthorized('Missing X-Ingest-Key header.');
  if (req.get('authorization')) throw forbidden('Send either a user token or an analyzer key, not both.');
  req.account = authService.verifyIngestKey(key);
  req.principal = 'ingest';
  next();
}

export function currentAccount(req: Request): AuthAccount {
  if (!req.account) throw unauthorized();
  return req.account;
}
