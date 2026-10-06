import { createFileRoute } from '@tanstack/react-router';
import { authHandleRequest } from '@/services/auth/auth.server';

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request, context }) => authHandleRequest(request, context),
      POST: ({ request, context }) => authHandleRequest(request, context),
    },
  },
});
