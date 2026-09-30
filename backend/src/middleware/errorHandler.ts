import type { NextFunction, Request, Response } from 'express';
import { AppError, type ErrorDetail } from '../lib/errors.js';

interface ErrorBody {
  success: false;
  error: string;
  code: string;
  details: ErrorDetail[];
}

function send(res: Response, status: number, code: string, message: string, details: ErrorDetail[] = []): void {
  const body: ErrorBody = { success: false, error: message, code, details };
  res.status(status).json(body);
}

function bodyParserType(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'type' in err && typeof err.type === 'string') return err.type;
  return undefined;
}

export function notFoundHandler(req: Request, res: Response): void {
  send(res, 404, 'NOT_FOUND', `No route for ${req.method} ${req.path}.`);
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) {
    res.end();
    return;
  }
  if (err instanceof AppError) {
    send(res, err.status, err.code, err.message, err.details);
    return;
  }
  switch (bodyParserType(err)) {
    case 'entity.parse.failed':
      send(res, 400, 'MALFORMED_JSON', 'The request body is not valid JSON.');
      return;
    case 'entity.too.large':
      send(res, 413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
      return;
    case 'encoding.unsupported':
    case 'charset.unsupported':
      send(res, 415, 'UNSUPPORTED_ENCODING', 'Send the request body as UTF-8 JSON.');
      return;
  }
  console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  send(res, 500, 'INTERNAL_ERROR', 'Something went wrong on our side. Please try again.');
}
