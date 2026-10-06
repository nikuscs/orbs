import { Errors } from '@orbs/errors/universal';
import { log } from '@orbs/logger/client';
import { isCancelledError, QueryCache, QueryClient } from '@tanstack/react-query';
import { createMiddleware } from '@tanstack/react-start';

export function tanstackQueryContext() {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({}),
    defaultOptions: {
      mutations: {
        onError: (error) => {
          if (isCancelledError(error)) {
            return;
          }

          log.error({ action: 'mutation_error', error });
        },
      },
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });

  return { queryClient };
}

export const tanstackEvlogMiddleware = createMiddleware({
  type: 'request',
}).server(async (ctx) => {
  const [
    { createGeoEnricher, createUserAgentEnricher },
    { createMiddlewareLogger, extractSafeHeaders },
    { log: serverLog, storage },
    { securityExtractClientIp },
  ] = await Promise.all([
    import('evlog/enrichers'),
    import('evlog/toolkit'),
    import('@orbs/logger/server'),
    import('@orbs/server/server'),
  ]);

  const { next, pathname, request } = ctx;
  const requestId = request.headers.get('x-request-id') ?? request.headers.get('cf-ray') ?? crypto.randomUUID();
  const enrichUserAgent = createUserAgentEnricher();
  const enrichGeo = createGeoEnricher();

  const { logger, finish, skipped } = createMiddlewareLogger({
    method: request.method,
    path: pathname,
    requestId,
    headers: extractSafeHeaders(request.headers),
    exclude: ['/t/ingest'],
    enrich: (event) => {
      enrichUserAgent(event);
      enrichGeo(event);
    },
  });

  if (skipped) {
    return next();
  }

  logger.set({ clientIp: securityExtractClientIp(request.headers) });

  return storage.run(logger, async () => {
    try {
      const result = await next();

      if (result.response.status >= 400) {
        logger.warn(`Request completed with status ${result.response.status}`, { status: result.response.status });
        await finish({ status: result.response.status });
      }

      return result;
    } catch (error) {
      if (
        (error instanceof DOMException && error.name === 'AbortError') ||
        (error instanceof Error && error.name === 'AbortError')
      ) {
        throw error;
      }

      serverLog.error({
        tag: 'request',
        message: 'Request failed',
        error,
      });
      await finish({
        error: error instanceof Error ? error : new Errors.INTERNAL_ERROR({ cause: error }),
      });
      throw error;
    }
  });
});
