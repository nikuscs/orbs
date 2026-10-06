import { createFileRoute } from '@tanstack/react-router';
import { seoSitemapResponse } from '@/services/seo/seo.server';

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: ({ request, context }) => seoSitemapResponse(request, context),
    },
  },
});
