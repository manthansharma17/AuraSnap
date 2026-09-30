import { z } from 'zod';
import { CATEGORY_KEYS } from '../../domain.js';

export const CheckIdParams = z.object({
  id: z.uuid('Check id is not valid'),
});

export const ListChecksQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const TrendQuery = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});

const IsoWithZone = z.iso.datetime({ offset: true, message: 'Use ISO 8601 with a time zone, e.g. 2026-09-28T10:42:00+05:30' });

export const IngestCheckSchema = z.object({
  cameraId: z.string().regex(/^cam-\d{1,6}$/, 'Camera id looks like cam-1'),
  category: z.enum(CATEGORY_KEYS),
  result: z.enum(['pass', 'fail']),
  message: z.string().trim().min(3).max(200),
  at: IsoWithZone.optional(),
});

export const IngestChecksBody = z.union([IngestCheckSchema, z.array(IngestCheckSchema).min(1).max(100)]);

export const VerificationSchema = z.object({
  feedVerified: z.boolean(),
  verifiedAt: IsoWithZone.optional(),
});

export type IngestCheckInput = z.infer<typeof IngestCheckSchema>;
export type VerificationInput = z.infer<typeof VerificationSchema>;
