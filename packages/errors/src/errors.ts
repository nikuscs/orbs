import { ORPCError } from '@orpc/client';
import { z } from 'zod';

export interface AppErrorSchema {
  message: string;
  status?: number;
  data?: z.ZodType<object>;
  internal?: string;
  reportable?: boolean;
}

type InferSchemaData<S extends AppErrorSchema> = S extends { data: z.ZodType<infer D> } ? D : Record<string, never>;

interface ThrowOptions {
  report?: boolean;
  internal?: string;
  cause?: unknown;
}

export interface AppError<TCode extends string = string, TData = unknown> {
  readonly code: TCode;
  readonly message: string;
  readonly data: TData;
  readonly reportable: boolean;
  readonly internal: string;
  readonly cause?: unknown;
}

abstract class BaseAppError<TCode extends string, TData> extends ORPCError<TCode, TData> implements AppError<TCode, TData> {
  readonly reportable: boolean;
  readonly internal: string;
  override readonly cause?: unknown;

  constructor(code: TCode, schema: AppErrorSchema, data: TData, options: ThrowOptions) {
    super(code, {
      message: schema.message,
      data,
      cause: options.cause,
    });

    this.reportable = options.report ?? schema.reportable ?? true;
    this.cause = options.cause;

    const baseMessage = options.internal ?? schema.internal ?? schema.message;
    this.internal = buildInternalMessage(baseMessage, options.cause);
  }
}

function extractCauseMessage(cause: unknown): string | null {
  if (!cause) {
    return null;
  }

  if (cause instanceof Error) {
    return cause.message;
  }

  const message = z.string().safeParse(cause);

  if (message.success) {
    return message.data;
  }

  return null;
}

function buildInternalMessage(baseMessage: string, cause: unknown): string {
  const causeMessage = extractCauseMessage(cause);
  return causeMessage ? `${baseMessage}: ${causeMessage}` : baseMessage;
}

function defineError<K extends string, S extends AppErrorSchema>(code: K, schema: S) {
  type Data = InferSchemaData<S>;
  return class extends BaseAppError<K, Data> {
    constructor(input?: object) {
      // SAFETY: the public generated constructor type permits only schema data fields plus ThrowOptions.
      const { report, internal, cause, ...data } = (input ?? {}) as ThrowOptions & Record<string, unknown>;

      // SAFETY: removing every ThrowOptions key leaves exactly the schema-derived Data payload.
      super(code, schema, data as Data, {
        report,
        internal,
        cause,
      });
    }

    static fromSnapshot(data: object) {
      return new this(schema.data ? schema.data.parse(data) : data);
    }
  };
}

interface ErrorClass<K extends string, S extends AppErrorSchema> {
  new (
    input?: S extends { data: z.ZodType } ? InferSchemaData<S> & ThrowOptions : ThrowOptions | undefined,
  ): ORPCError<K, InferSchemaData<S>> & AppError<K, InferSchemaData<S>>;
  fromSnapshot: (data: object) => ORPCError<K, InferSchemaData<S>> & AppError<K, InferSchemaData<S>>;
}

export function createErrors<T extends Record<string, AppErrorSchema>>(schemas: T) {
  // SAFETY: the loop below assigns one generated ErrorClass for every own key of schemas before this object escapes.
  const errors = {} as { [K in keyof T]: ErrorClass<K & string, T[K]> };

  for (const code in schemas) {
    if (Object.hasOwn(schemas, code)) {
      // SAFETY: defineError receives the schema at this same key, preserving the mapped key/schema correlation.
      errors[code] = defineError(code, schemas[code]);
    }
  }

  return errors;
}

export function createErrorStatusMap<T extends Record<string, AppErrorSchema>>(schemas: T) {
  const statusMap: Partial<Record<keyof T, number>> = {};

  for (const code in schemas) {
    const status = schemas[code].status;

    if (Object.hasOwn(schemas, code) && status !== undefined) {
      statusMap[code] = status;
    }
  }

  return statusMap;
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof BaseAppError;
}
