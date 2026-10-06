import { env as bindings } from 'cloudflare:workers';
import { TENANT } from '@orbs/server/client';
import { makeCloudflareServices } from '@orbs/server/cloudflare';
import { serverHandler } from './server.tanstack';
import type { ApplicationRequestContext } from '@/types/application.types';

export { TenantObject } from '@orbs/server/cloudflare';

export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    const context: ApplicationRequestContext = { services: makeCloudflareServices(bindings) };

    if (pathname === TENANT.browserSocketPath || pathname === TENANT.daemonSocketPath) {
      const authorization = await context.services.tenant.actions.socketAuthorize({ request });

      if (!authorization.ok) {
        return new Response(null, { status: authorization.status });
      }

      const headers = new Headers(request.headers);
      headers.set(TENANT.ownerHeader, authorization.ownerTag);

      return bindings.TENANT.getByName(authorization.organizationId).fetch(new Request(request, { headers }));
    }

    if (pathname.startsWith(TENANT.filePath)) {
      return context.services.tenant.queries.file({ request });
    }

    return serverHandler(request, { request: context });
  },
};
