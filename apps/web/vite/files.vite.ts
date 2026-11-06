import type * as ConnectionUtils from '../src/services/connection/connection.utils';
import type { Plugin } from 'vite';

export function createFilesPlugin(): Plugin {
  return {
    name: 'orbs-files',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, _response, next) => {
        try {
          if (request.url?.startsWith('/files/') && !request.headers.authorization) {
            const { connectionFileHeaders } = await server.ssrLoadModule('/src/services/connection/connection.utils.ts') as typeof ConnectionUtils;
            Object.assign(request.headers, connectionFileHeaders(request.headers.cookie ?? ''));
          }

          next();
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
