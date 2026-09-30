import type { AuthAccount } from '../modules/auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      account?: AuthAccount;
      principal?: 'user' | 'ingest';
    }
  }
}

export {};
