import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { join } from 'node:path';
import { routes } from '../src/application/routes.ts';

export function createTanstackStartPlugin(serverEntry: string) {
  return tanstackStart({
    rsc: { enabled: true },
    server: { entry: join('application', serverEntry) },
    router: {
      entry: join('application', 'router.tsx'),
      generatedRouteTree: join('application', 'routes.tree.ts'),
      quoteStyle: 'double',
      semicolons: true,
      virtualRouteConfig: routes,
    },
    importProtection: {
      behavior: {
        dev: 'mock',
        build: 'error',
      },
      log: 'always',
      maxTraceDepth: 30,
      client: {
        specifiers: [
          '@orbs/i18n/server',
          '@orbs/logger/server',
          '@orbs/server/rpc',
          '@orbs/server/server',
          '@orbs/server/cloudflare',
          '@orbs/server/native',
        ],
        files: ['**/*.server.*'],
      },
      server: {
        files: [],
      },
    },
  });
}
