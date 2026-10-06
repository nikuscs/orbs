import { createMockBucket } from './bucket.mock';
import { createMockRateLimit } from './rate-limit.mock';
import { createMockTenantNamespace } from './tenant.mock';

export function createBoundaryMocks() {
  return {
    bucket: createMockBucket,
    rateLimit: createMockRateLimit,
    tenantNamespace: createMockTenantNamespace,
  };
}
