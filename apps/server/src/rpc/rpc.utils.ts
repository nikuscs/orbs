import { Errors, errorSchemas, isAppError } from '@orbs/errors/universal';
import { log } from '@orbs/logger/server';
import { ORPCError, ValidationError } from '@orpc/server';
import { rpcRateLimitData } from '#/types/rpc.types';
import { RPC_RATE_LIMIT } from './rpc.constants';
import type { AppErrorCode } from '@orbs/errors/universal';
import type { ThrowableError } from '@orpc/server';

function rpcIsAppErrorCode(code: string): code is AppErrorCode {
  return code in errorSchemas;
}

function rpcIsReportable(error: ThrowableError): boolean {
  if (isAppError(error)) {
    return error.reportable;
  }

  if (error instanceof ORPCError && rpcIsAppErrorCode(error.code)) {
    return errorSchemas[error.code].reportable;
  }

  return true;
}

export function rpcHandleClientError(error: ThrowableError) {
  if (!(error instanceof ORPCError)) {
    return;
  }

  if (error.code === 'BAD_REQUEST' && error.cause instanceof ValidationError) {
    const fields: Record<string, { message: string }> = {};

    for (const issue of error.cause.issues) {
      const field = issue.path?.map((segment) => String(segment instanceof Object ? segment.key : segment)).join('.');

      if (field && !Object.hasOwn(fields, field)) {
        fields[field] = { message: issue.message };
      }
    }

    throw new Errors.VALIDATION_ERROR({ fields, cause: error.cause });
  }

  if (error.code === 'TOO_MANY_REQUESTS') {
    const reset = rpcRateLimitData.safeParse(error.data).data?.reset;
    const retryAfter = reset ? Math.max(1, Math.ceil((reset - Date.now()) / 1000)) : RPC_RATE_LIMIT.retryAfterFallbackSeconds;
    throw new Errors.RATE_LIMITED({ retryAfter, cause: error });
  }
}

export function rpcHandleErrorReporting(error: ThrowableError) {
  if (!rpcIsReportable(error)) {
    return;
  }

  log.error({
    tag: 'rpc',
    message: 'RPC Error',
    error,
    code: error instanceof ORPCError ? error.code : undefined,
    cause: isAppError(error) ? error.internal : undefined,
  });
}
