import { envServer } from '@orbs/env/server';
import { Errors } from '@orbs/errors/universal';
import { log } from '@orbs/logger/server';
import { Database as Sqlite, SQLiteError } from 'bun:sqlite';
import { mkdirSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { makeServices } from '#/core/core.services';
import { makeTenantRuntimeDirectory } from '#/core/core.tenant-runtime';
import { DATABASE } from '#services/database/database.constants';
import { makeDatabaseService } from '#services/database/database.service';
import { RATE_LIMITER } from '#services/rate-limiter/rate-limiter.constants';
import { makeRateLimiterService } from '#services/rate-limiter/rate-limiter.service';
import { makeStorageService } from '#services/storage/storage.service';
import { TENANT } from '#services/tenant/tenant.constants';
import type { CoreNativeHost, CoreNativeHostParams } from '#/types/core.types';
import type { DatabaseSchema } from '#/types/database.types';
import type { TenantRuntimeSocketData } from '#/types/tenant-runtime.types';

export async function makeNativeHost({ port }: CoreNativeHostParams): Promise<CoreNativeHost> {
  const defaults = { APP_URL: `http://localhost:${String(port)}` };
  const env = envServer({ ...defaults, ...process.env });
  const dataRoot = env.ORBS_DATA_ROOT ?? join(homedir(), '.orbs', 'data');

  mkdirSync(dataRoot, { recursive: true });

  const root = realpathSync(dataRoot);
  const lock = new Sqlite(join(root, 'orbs.lock'), { create: true });

  try {
    lock.run('BEGIN EXCLUSIVE');
  } catch (error) {
    lock.close();

    if (error instanceof SQLiteError && error.code === 'SQLITE_BUSY') {
      throw new Errors.CONFLICT({ internal: 'Data folder is locked by another process', cause: error });
    }

    throw error;
  }

  const database = makeDatabaseService<DatabaseSchema>({
    path: join(root, 'core.sqlite'),
    migrations: DATABASE.migrations,
    env,
  });

  await database.migrate();

  const storage = makeStorageService({ driver: 'disk', root: join(root, 'files') });

  const rateLimiters = {
    rpc: makeRateLimiterService({ driver: 'memory', policy: RATE_LIMITER.rpc }),
    auth: makeRateLimiterService({ driver: 'memory', policy: RATE_LIMITER.auth }),
    ingest: makeRateLimiterService({ driver: 'memory', policy: RATE_LIMITER.ingest }),
  };

  const tenants = makeTenantRuntimeDirectory({
    path: join(root, 'tenants'),
    database: { main: database },
    storage,
    env,
  });

  await tenants.start();

  const services = () => makeServices({
    env,
    database: { main: database },
    storage,
    tenants,
    rateLimiters,
  });

  let stopping = false;

  return {
    env,
    services,
    socketUpgrade: async (request, server) => {
      const authorization = await services().tenant.actions.socketAuthorize({ request });

      if (!authorization.ok) {
        return new Response(null, { status: authorization.status });
      }

      const data: TenantRuntimeSocketData = {
        organizationId: authorization.organizationId,
        ownerTag: authorization.ownerTag,
        daemon: new URL(request.url).pathname === TENANT.daemonSocketPath,
        connection: null,
      };

      return server.upgrade(request, { data }) ? undefined : new Response(null, { status: 400 });
    },
    websocket: {
      open: (socket) => {
        if (stopping) {
          socket.close(TENANT.shutdownCloseCode, 'shutdown');
          return;
        }

        try {
          socket.data.connection = tenants.connect(socket.data.organizationId, {
            socket,
            daemon: socket.data.daemon,
            ownerTag: socket.data.ownerTag,
          });
        } catch (error) {
          log.error({
            tag: 'native',
            message: 'WebSocket connection failed',
            error,
          });
          socket.close(TENANT.unresponsiveCloseCode, 'socket error');
        }
      },
      message: (socket, message) => {
        if (message instanceof Uint8Array || !socket.data.daemon) {
          return;
        }

        socket.data.connection?.message(message);
      },
      close: (socket) => socket.data.connection?.closed(),
    },
    dispose: async () => {
      stopping = true;
      await tenants.dispose();
      database.close();
      lock.close();
    },
  };
}
