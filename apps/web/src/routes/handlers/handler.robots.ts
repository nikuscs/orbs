import { createFileRoute } from '@tanstack/react-router';
import { seoRobotsResponse } from '@/services/seo/seo.server';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: ({ request, context }) => seoRobotsResponse(request, context),
    },
  },
});
