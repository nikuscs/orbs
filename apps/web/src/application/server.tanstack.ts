import { baseLocale, cookieName, isLocale, paraglideMiddleware } from '@orbs/i18n/server';
import { log } from '@orbs/logger/server';
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';
import { parse } from 'cookie-es';
import type { ApplicationLocaleMiddlewareContext, ApplicationMiddleware, ApplicationRequestHandler } from '@/types/application.types';
import type { Locale } from '@orbs/i18n/server';

const handleStartRequest = createStartHandler((context) => {
  for (const match of context.router.state.matches) {
    if (match.status === 'error') {
      log.error({
        tag: 'router',
        message: 'Route load failed',
        error: match.error,
        routeId: match.routeId,
      });
    }
  }

  return defaultStreamHandler(context);
});

function parseLocaleCookie(request: Request): Locale | undefined {
  const value = parse(request.headers.get('cookie') ?? '')[cookieName];

  return value !== undefined && isLocale(value) ? value : undefined;
}

function createCookieHeader(locale: string): string {
  return `${cookieName}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function applyHeaders(response: Response, headers: Record<string, string>, setCookie?: string): Response {
  try {
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }

    if (setCookie) {
      response.headers.append('Set-Cookie', setCookie);
    }

    return response;
  } catch {
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    });

    for (const [key, value] of Object.entries(headers)) {
      newResponse.headers.set(key, value);
    }

    if (setCookie) {
      newResponse.headers.append('Set-Cookie', setCookie);
    }

    return newResponse;
  }
}

function chainApplicationMiddlewares(middlewares: ApplicationMiddleware[], terminal: ApplicationRequestHandler): ApplicationRequestHandler {
  return middlewares.reduceRight<ApplicationRequestHandler>(
    (next, middleware) => (request, context) => middleware(request, context, next),
    terminal,
  );
}

const applicationRedirectTrailingSlashMiddleware: ApplicationMiddleware = async (request, context, next) => {
  const requestUrl = new URL(request.url);

  if (requestUrl.pathname !== '/' && requestUrl.pathname.endsWith('/')) {
    requestUrl.pathname = requestUrl.pathname.slice(0, -1);

    return new Response(null, { status: 308, headers: { Location: requestUrl.toString() } });
  }

  return next(request, context);
};

const applicationLocaleMiddleware: ApplicationMiddleware = async (request, context, next) => (
  paraglideMiddleware(request, async ({ locale }: ApplicationLocaleMiddlewareContext) => {
    context.locale = locale;
    return next(request, context);
  })
);

const applicationLocaleCookieMiddleware: ApplicationMiddleware = async (request, context, next) => {
  const response = await next(request, context);
  const locale = context.locale;
  const shouldSetCookie = locale !== undefined && locale !== baseLocale && locale !== parseLocaleCookie(request);

  return shouldSetCookie ? applyHeaders(response, {}, createCookieHeader(locale)) : response;
};

const applicationAppVersionMiddleware: ApplicationMiddleware = async (request, context, next) => {
  const response = await next(request, context);
  const version = import.meta.env.VITE_APP_VERSION;

  return version ? applyHeaders(response, { 'x-app-version': version }) : response;
};

export const serverHandler = chainApplicationMiddlewares([
  applicationRedirectTrailingSlashMiddleware,
  applicationLocaleMiddleware,
  applicationLocaleCookieMiddleware,
  applicationAppVersionMiddleware,
], async (request, context) => handleStartRequest(request, { context: context.request }));
