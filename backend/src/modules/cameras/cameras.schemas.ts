import net from 'node:net';
import { z } from 'zod';
import { ZONES } from '../../domain.js';

const HOSTNAME = /^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export const CameraIdParams = z.object({
  id: z.string().regex(/^cam-\d{1,6}$/, 'Camera id looks like cam-1'),
});

export const NetworkTestSchema = z.object({
  address: z
    .string()
    .trim()
    .transform((v) => v.replace(/^rtsp:\/\//i, '').replace(/^\[|\]$/g, ''))
    .refine((v) => net.isIP(v) !== 0 || HOSTNAME.test(v), 'Enter the recorder IP address or host name'),
  port: z.coerce.number().int().min(1).max(65535).default(554),
  username: z.string().trim().min(1, 'Enter the recorder username').max(128),
  password: z.string().min(1, 'Enter the recorder password').max(256),
  channels: z
    .array(
      z.object({
        path: z
          .string()
          .trim()
          .min(1)
          .max(300)
          .regex(/^\/?[\x21-\x7e]+$/, 'Stream path must be printable characters without spaces'),
        name: z.string().trim().min(1).max(80).optional(),
        zone: z.enum(ZONES).optional(),
      }),
    )
    .min(1)
    .max(64)
    .optional(),
});

export const UpdateCameraSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    zone: z.enum(ZONES).optional(),
  })
  .refine((v) => v.name !== undefined || v.zone !== undefined, 'Send a name or a zone to change');

export type NetworkTestInput = z.infer<typeof NetworkTestSchema>;
export type UpdateCameraInput = z.infer<typeof UpdateCameraSchema>;
