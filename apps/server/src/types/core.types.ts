import type { Services } from '#/types/services.types';
import type { TenantRuntimeSocketData } from '#/types/tenant-runtime.types';
import type { EnvServer } from '@orbs/env/server';
import type { Server, WebSocketHandler } from 'bun';

export interface CoreNativeHostParams {
  port: number;
}

export interface CoreNativeHost {
  env: EnvServer;
  services: () => Services;
  socketUpgrade: (request: Request, server: Server<TenantRuntimeSocketData>) => Promise<Response | undefined>;
  websocket: WebSocketHandler<TenantRuntimeSocketData>;
  dispose: () => Promise<void>;
}
