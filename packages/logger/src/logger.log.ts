import { log as eventLog } from 'evlog';
import { storage } from './context';

type LogPayload = { tag: string; message: string; error?: unknown } & Record<string, unknown>;

function toLogError(error: Error) {
  // SAFETY: Error subclasses may expose these optional fields; every field is checked before typed use.
  const details = error as Error & { code?: unknown; data?: unknown; internal?: unknown; cause?: unknown };

  const result: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  const code = String(details.code);

  if (details.code === code) {
    result.code = code;
  }

  if (details.data !== undefined) {
    result.data = details.data;
  }

  const internal = String(details.internal);

  if (details.internal === internal) {
    result.internal = internal;
  }

  if (details.cause !== undefined) {
    result.cause = details.cause instanceof Error ? toLogError(details.cause) : details.cause;
  }

  return result;
}

const log = {
  debug(payload: LogPayload) {
    const { tag, message, ...fields } = payload;
    const requestLogger = storage.getStore();

    if (requestLogger) {
      requestLogger.info(message, { tag, ...fields });
      return;
    }

    eventLog.debug({
      tag,
      message,
      ...fields,
    });
  },
  error(payload: LogPayload) {
    const { tag, message, error, ...fields } = payload;
    const requestLogger = storage.getStore();
    const errArg = error instanceof Error ? error : message;

    if (requestLogger) {
      const requestFields: Record<string, unknown> = { tag, message, ...fields };

      if (error !== undefined && !(error instanceof Error)) {
        requestFields.error = error;
      }
      requestLogger.error(errArg, requestFields);

      return;
    }

    const eventFields: Record<string, unknown> = { tag, message, ...fields };

    if (error !== undefined) {
      eventFields.error = error instanceof Error ? toLogError(error) : error;
    }
    eventLog.error(eventFields);
  },
  info(payload: LogPayload) {
    const { tag, message, ...fields } = payload;
    const requestLogger = storage.getStore();

    if (requestLogger) {
      requestLogger.info(message, { tag, ...fields });
      return;
    }

    eventLog.info({
      tag,
      message,
      ...fields,
    });
  },
  set(fields: Record<string, unknown>) {
    storage.getStore()?.set(fields);
  },
  warn(payload: LogPayload) {
    const { tag, message, ...fields } = payload;
    const requestLogger = storage.getStore();

    if (requestLogger) {
      requestLogger.warn(message, { tag, ...fields });
      return;
    }

    eventLog.warn({
      tag,
      message,
      ...fields,
    });
  },
};

export { log };
export type { LogPayload };
