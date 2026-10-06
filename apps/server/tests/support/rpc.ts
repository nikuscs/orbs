import { TEST_ENV } from './env';
import { createTestServices } from './services';
import type { TestD1 } from './database';

export function rpcContext(testD1: TestD1, headers: Headers) {
  return {
    headers,
    request: new Request(`${TEST_ENV.APP_URL}/rpc`, { headers }),
    services: createTestServices(testD1),
  };
}
