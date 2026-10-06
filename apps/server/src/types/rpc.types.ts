import { z } from 'zod';
import type { router } from '#/rpc/rpc.router';
import type { Services } from '#/types/services.types';
import type { ResponseHeadersPluginContext } from '@orpc/server/plugins';

export type RpcRouter = typeof router;

export interface RpcBaseContext extends ResponseHeadersPluginContext {
  headers: Headers;
  request: Request;
  onCookie?: (cookie: string) => void;
  services: Services;
}

export const rpcRateLimitData = z.object({ reset: z.number().optional() });
