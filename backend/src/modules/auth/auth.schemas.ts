import { z } from 'zod';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?\d{7,15}$/;

/** Emails are lower-cased; phone numbers lose spaces, dashes and brackets. */
export function normalizeLoginId(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.includes('@') ? trimmed.toLowerCase() : trimmed.replace(/[\s\-()]/g, '');
}

const loginId = z
  .string()
  .max(254)
  .transform(normalizeLoginId)
  .refine((v) => EMAIL.test(v) || PHONE.test(v), 'Enter a valid email address or phone number');

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Restaurant name must be at least 2 characters').max(120),
  id: loginId,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

export const LoginSchema = z.object({
  id: z.string().max(254).transform(normalizeLoginId).pipe(z.string().min(1, 'Enter your email or phone')),
  password: z.string().min(1, 'Enter your password').max(128),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
