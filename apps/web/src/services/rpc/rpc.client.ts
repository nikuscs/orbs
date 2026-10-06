import { Errors } from '@orbs/errors/universal';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import { BatchLinkPlugin } from '@orpc/client/plugins';
import { createRouterClient } from '@orpc/server';
import { createRouterUtils } from '@orpc/tanstack-query';
import { createIsomorphicFn, getGlobalStartContext } from '@tanstack/react-start';
import { getRequest, getResponseHeaders } from '@tanstack/react-start/server';
import { skewService } from '@/services/skew/skew.client';
import { router as rpcRouter } from '@orbs/server/rpc';
import type { RpcRouter } from '@orbs/server/client';
import type { RouterClient } from '@orpc/server';

export const rpc = createRouterUtils(createIsomorphicFn().server(() => createRouterClient(rpcRouter, {
  context: () => {
    const request = getRequest();
    const start = getGlobalStartContext();

    if (!start) {
      throw new Errors.INTERNAL_ERROR({ internal: 'Missing request context for server RPC' });
    }

    return {
      headers: request.headers,
      onCookie: (cookie: string) => getResponseHeaders().append('Set-Cookie', cookie),
      request,
      services: start.services,
    };
  },
})).client(() => {
  const link = new RPCLink({
    url: '/rpc',
    plugins: [
      new BatchLinkPlugin({
        filter: ({ request }) => !request.signal,
        groups: [{ condition: () => true, context: {} }],
      }),
    ],
    fetch: async (request, init) => {
      const response = await globalThis.fetch(request, { ...init, credentials: 'include' });
      skewService.markStale(response.headers.get('x-app-version'));

      return response;
    },
  });

  return createORPCClient<RouterClient<RpcRouter>>(link);
})());
