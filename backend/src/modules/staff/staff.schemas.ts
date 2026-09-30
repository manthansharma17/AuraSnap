import { z } from 'zod';
import { ROLES, STAFF_AREAS } from '../../domain.js';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const EmpIdParams = z.object({
  empId: z.string().regex(/^EMP-\d{1,9}$/, 'Employee id looks like EMP-1037'),
});

const StaffFields = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  role: z.enum(ROLES),
  area: z.enum(STAFF_AREAS),
  from: z.string().regex(HHMM, 'Use 24-hour HH:MM'),
  to: z.string().regex(HHMM, 'Use 24-hour HH:MM'),
  phone: z
    .string()
    .transform((v) => v.replace(/[\s\-()]/g, ''))
    .pipe(z.string().regex(/^\+?\d{7,15}$/, 'Enter a valid phone number')),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254))]).default(''),
  notify: z.boolean().default(false),
});

const shiftNotEmpty = (v: { from: string; to: string }) => v.from !== v.to;
const shiftMessage = { message: 'Shift start and end cannot be the same time', path: ['to'] };

export const CreateStaffSchema = StaffFields.extend({
  empId: z.string().regex(/^EMP-\d{1,9}$/, 'Employee id looks like EMP-1037').optional(),
}).refine(shiftNotEmpty, shiftMessage);

export const UpdateStaffSchema = StaffFields.refine(shiftNotEmpty, shiftMessage);

export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;
export type UpdateStaffInput = z.infer<typeof UpdateStaffSchema>;
