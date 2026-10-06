import { createFaviconLinks, createMetadata } from '@orbs/tanstack-helpers/universal';
import { createRootRouteWithContext } from '@tanstack/react-router';
import { LayoutRoot, LayoutRootError, LayoutRootNotFound } from '@/components/layout/layout-root';
import { rpc } from '@/services/rpc/rpc.client';
import { SEO_METADATA_DEFAULTS } from '@/services/seo/seo.constants';
import { tanstackEvlogMiddleware } from '@/services/tanstack/tanstack.client';
import appCss from '../application/styles.css?url';
import type { RouterContext } from '@/types/router.types';

export const Route = createRootRouteWithContext<RouterContext>()({
  server: {
    middleware: [tanstackEvlogMiddleware],
  },
  beforeLoad: async ({ context }) => {
    const auth = await context.queryClient.ensureQueryData(rpc.auth.session.queryOptions());

    return {
      user: auth?.user ?? null,
      session: auth?.session ?? null,
      organization: auth?.organization ?? null,
    };
  },
  head: () => ({
    meta: createMetadata({ defaults: SEO_METADATA_DEFAULTS }),
    links: [
      { rel: 'stylesheet', href: appCss },
      ...createFaviconLinks(),
    ],
  }),
  component: LayoutRoot,
  errorComponent: LayoutRootError,
  notFoundComponent: LayoutRootNotFound,
});
