import { z } from 'zod';
import type { ORPCError } from '@orpc/client';

export type ErrorsCause = ErrorOptions['cause'];

export interface ErrorsDefinition {
  message: string;
  status?: number;
  data?: z.ZodType<object>;
  internal?: string;
  reportable?: boolean;
}

export type ErrorsSchemaData<S extends ErrorsDefinition> = S extends { data: z.ZodType<infer D> } ? D : Record<string, never>;

export interface ErrorsThrowOptions {
  internal?: string;
  cause?: ErrorsCause;
}

export interface ErrorsInstance<TCode extends string = string, TData = object> {
  readonly code: TCode;
  readonly message: string;
  readonly data: TData;
  readonly reportable: boolean;
  readonly internal: string;
  readonly cause?: ErrorsCause;
}

export type ErrorsClass<K extends string, S extends ErrorsDefinition> = new (
  input?: S extends { data: z.ZodType } ? ErrorsSchemaData<S> & ErrorsThrowOptions : ErrorsThrowOptions | undefined,
) => ORPCError<K, ErrorsSchemaData<S>> & ErrorsInstance<K, ErrorsSchemaData<S>>;

export const errorSchemas = {
  UNAUTHORIZED: { message: 'You must be logged in', status: 401, reportable: false },
  FORBIDDEN: { message: 'Insufficient permissions', status: 403, reportable: false },
  CONFLICT: { message: 'Busy right now, try again shortly', status: 409, reportable: false },
  PROTOCOL_MISMATCH: {
    message: 'Client and server protocol versions do not match',
    status: 400,
    data: z.object({ supportedVersion: z.number().int().positive(), receivedVersion: z.string().nullable() }),
    reportable: false,
  },
  SERVER_MISMATCH: { message: 'This address belongs to a different server', status: 409, reportable: false },
  UPSTREAM_UNAVAILABLE: { message: 'An external service is unavailable', status: 502, reportable: false },
  SERVER_UNREACHABLE: { message: "Can't reach your server", status: 503, reportable: false },

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

  INTERNAL_ERROR: { message: 'Unexpected error', status: 500, reportable: true },
} as const satisfies Record<string, ErrorsDefinition>;

export type ErrorsSchemas = typeof errorSchemas;

export type ErrorsCode = keyof ErrorsSchemas;

export const errorsCauseMessageSchema = z.string();
