import { z } from 'zod';
import { createErrors, createErrorStatusMap, isAppError as isKnownAppError } from './errors';
import type { AppError, AppErrorSchema } from './errors';

const errorSchemas = {
  UNAUTHORIZED: { message: 'You must be logged in', status: 401, reportable: false },
  FORBIDDEN: { message: 'Insufficient permissions', status: 403, reportable: false },
  CONFLICT: { message: 'Busy right now, try again shortly', status: 409, reportable: false },

  NOT_FOUND: { message: 'Resource not found', status: 404, data: z.object({ resource: z.string().optional(), resourceId: z.union([z.string(), z.number()]).optional() }), reportable: false },
  VALIDATION_ERROR: {
    message: 'Validation failed',
    status: 422,
    data: z.object({
      fields: z.record(
        z.string(),
        z.object({
          message: z.string(),
          args: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
        }),
      ),
    }),
    reportable: false,
  },
  RATE_LIMITED: { message: 'Too many requests', status: 429, data: z.object({ retryAfter: z.number() }), reportable: false },

  USER_BANNED: { message: 'This account is suspended', status: 403, data: z.object({ until: z.string().nullable() }), reportable: false },

  MAIL_SEND_FAILED: { message: 'Email could not be sent', status: 502, reportable: true },

  INTERNAL_ERROR: { message: 'Unexpected error', status: 500, reportable: true },
} as const satisfies Record<string, AppErrorSchema>;

export { errorSchemas };
export type AppErrorSchemas = typeof errorSchemas;
export type AppErrorCode = keyof AppErrorSchemas;

export const Errors = createErrors(errorSchemas);
export const errorStatusMap = createErrorStatusMap(errorSchemas);

export type AppErrorData<K extends AppErrorCode> =
  AppErrorSchemas[K] extends { data: z.ZodType<infer D> } ? D : Record<string, never>;

export function isAppError(error: unknown): error is AppError<AppErrorCode> {
  return isKnownAppError(error);
}
