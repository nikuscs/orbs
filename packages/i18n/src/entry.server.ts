import { AsyncLocalStorage } from 'node:async_hooks';
import { PRIVATE_PATH_REGEX } from './config';
import { cookieName as _cookieName, defineCustomServerStrategy, extractLocaleFromRequest, overwriteServerAsyncLocalStorage, serverAsyncLocalStorage } from './paraglide/runtime.js';
import type { Locale } from './config';

export { paraglideMiddleware } from './paraglide/server.js';

export { getLocale, isLocale, locales, baseLocale, extractLocaleFromRequest, cookieName } from './paraglide/runtime.js';

export { resolveLocale } from './config';
export type { Locale } from './config';

export { m } from './paraglide/messages.js';

// Queues, crons and workflow steps have no request, so paraglideMiddleware never runs there:
// pass the locale explicitly (m.key(inputs, { locale }) or runWithLocale).
export function runWithLocale<T>(locale: Locale, run: () => T) {
  const store = serverAsyncLocalStorage ?? new AsyncLocalStorage<{ locale?: Locale }>();

  if (!serverAsyncLocalStorage) {
    overwriteServerAsyncLocalStorage(store);
  }

  return store.run({ locale }, run);
}

export function runWithRequestLocale<T>(request: Request, run: () => T) {
  return runWithLocale(extractLocaleFromRequest(request), run);
}

defineCustomServerStrategy('custom-privateRoute', {
  getLocale: (request: Request | undefined) => {
    if (!request) {
      return undefined;
    }

    const url = new URL(request.url);

    if (!PRIVATE_PATH_REGEX.test(url.pathname)) {
      return undefined;
    }

    const cookie = request.headers.get('cookie');

    if (!cookie) {
      return undefined;
    }

    const match = new RegExp(`(?:^|; )${_cookieName}=([^;]+)`).exec(cookie);
    return match?.[1] ?? undefined;
  },
});
