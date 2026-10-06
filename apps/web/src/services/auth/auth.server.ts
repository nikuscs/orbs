import type { ApplicationRequestContext } from '@/types/application.types';

export async function authHandleRequest(request: Request, context: ApplicationRequestContext): Promise<Response> {
  const { securityExtractClientIp } = await import('@orbs/server/server');
  const { success } = await context.services.rateLimiters.auth.limit(securityExtractClientIp(request.headers));

  if (!success) {
    return new Response(null, { status: 429, headers: { 'Cache-Control': 'no-store' } });
  }

  return context.services.auth.handler(request);
}
