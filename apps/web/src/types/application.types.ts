import type { Services } from '@orbs/server/server';

export interface ApplicationLocaleMiddlewareContext {
  locale: string;
}

export interface ApplicationMiddlewareContext {
  request: ApplicationRequestContext;
  locale?: string;
}

export type ApplicationRequestHandler = (request: Request, context: ApplicationMiddlewareContext) => Promise<Response>;
export type ApplicationMiddleware = (
  request: Request,
  context: ApplicationMiddlewareContext,
  next: ApplicationRequestHandler,
) => Promise<Response>;

export interface ApplicationRequestContext {
  services: Services;
}

declare module '@tanstack/react-start' {
  interface Register {
    server: {
      requestContext: ApplicationRequestContext;
    };
  }
}
