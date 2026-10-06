import type { makeNativeHost } from '@orbs/server/native';
import type { Services } from '@orbs/server/server';

export interface ServerNativeModule {
  makeNativeHost: typeof makeNativeHost;
  serverHandler: (request: Request, context: { request: { services: Services } }) => Promise<Response>;
}
