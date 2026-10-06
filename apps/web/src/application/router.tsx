import { deLocalizeUrl, localizeUrl } from '@orbs/i18n/runtime';
import { bootZodErrors } from '@orbs/i18n/validation';
import { createRouter as createTanStackRouter, defaultStringifySearch } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { skewService } from '@/services/skew/skew.client';
import { tanstackQueryContext } from '@/services/tanstack/tanstack.client';
import { routeTree } from './routes.tree';

bootZodErrors();

export function getRouter() {
  const reactQueryContext = tanstackQueryContext();

  const router = createTanStackRouter({
    routeTree,
    context: reactQueryContext,
    search: {
      strict: true,
    },
    stringifySearch: (search) => {
      if (!Array.isArray(search.ba_param)) {
        return defaultStringifySearch(search);
      }

      const { ba_param, ...rest } = search;
      const params = new URLSearchParams(defaultStringifySearch(rest));

      for (const value of ba_param) {
        params.append('ba_param', String(value));
      }

      const query = params.toString();
      return query ? `?${query}` : '';
    },
    trailingSlash: 'never',
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => {
        const localized = localizeUrl(url);

        if (localized.pathname !== '/' && localized.pathname.endsWith('/')) {
          localized.pathname = localized.pathname.slice(0, -1);
        }

        return localized;
      },
    },
    defaultPreload: false,
    scrollRestoration: ({ location }) => {
      const roomsManageOwnScroll = location.pathname.startsWith('/rooms');

      return !roomsManageOwnScroll;
    },
    defaultPreloadStaleTime: 0,
    defaultStructuralSharing: true,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient: reactQueryContext.queryClient,
  });

  if (!router.isServer && import.meta.env.PROD) {
    skewService.installListeners(router);
  }

  return router;
}
