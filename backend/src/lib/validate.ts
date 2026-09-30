import type { z } from 'zod';
import { unprocessable } from './errors.js';

export function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw unprocessable(
      'Some fields are missing or invalid.',
      result.error.issues.map((issue) => ({
        path: issue.path.map((p) => String(p)).join('.'),
        message: issue.message,
      })),
    );
  }
  return result.data;
}
