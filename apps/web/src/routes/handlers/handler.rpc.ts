import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/rpc/$')({
  server: {
    handlers: {
      ANY: async ({ request, context }) => {
        const { getRpcHandler } = await import('@orbs/server/server');
        const handler = await getRpcHandler();
        const cookies = new Set<string>();

        const { response } = await handler.handle(request, {
          prefix: '/rpc',
          context: { headers: request.headers, request, services: context.services, onCookie: (cookie) => cookies.add(cookie) },
        });

        for (const cookie of cookies) {
          response?.headers.append('Set-Cookie', cookie);
        }

        response?.headers.set('Cache-Control', 'no-store');

        return response ?? new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
      },
    },
  },
});
