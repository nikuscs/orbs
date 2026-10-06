import { makeServices } from '#/core/core.services';
import { makeRateLimiterService } from '#services/rate-limiter/rate-limiter.service';
import { makeStorageService } from '#services/storage/storage.service';
import { createBoundaryMocks } from '../mocks';
import { TEST_ENV } from './env';
import type { Factories } from '#/core/core.container';
import type { Services } from '#/types/services.types';
import type { TestD1 } from './database';

export interface TestServicesOptions {
  services?: Partial<Factories<Services>>;
}

export function createTestServices(testD1: TestD1, options: TestServicesOptions = {}) {
  const mocks = createBoundaryMocks();

  return makeServices({
    env: TEST_ENV,
    database: { main: testD1.database },
    storage: makeStorageService({ driver: 'cloudflare', bucket: mocks.bucket() }),
    tenants: mocks.tenantNamespace(),
    rateLimiters: {
      rpc: makeRateLimiterService({ driver: 'cloudflare', binding: mocks.rateLimit() }),
      auth: makeRateLimiterService({ driver: 'cloudflare', binding: mocks.rateLimit() }),
      ingest: makeRateLimiterService({ driver: 'cloudflare', binding: mocks.rateLimit() }),
    },
  }, options.services);
}
