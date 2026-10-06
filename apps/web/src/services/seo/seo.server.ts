import { seoBuildRobots, seoBuildSitemap } from '@/services/seo/seo.utils';
import type { ApplicationRequestContext } from '@/types/application.types';

export function seoOrigin(request: Request, context: ApplicationRequestContext): string {
  const appUrl = context.services.env.APP_URL.trim();

  return appUrl ? appUrl.replace(/\/$/, '') : new URL(request.url).origin;
}

export function seoRobotsResponse(request: Request, context: ApplicationRequestContext): Response {
  return new Response(seoBuildRobots(seoOrigin(request, context)), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export function seoSitemapResponse(request: Request, context: ApplicationRequestContext): Response {
  return new Response(seoBuildSitemap(seoOrigin(request, context)), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
