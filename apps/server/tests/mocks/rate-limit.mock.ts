import { vi } from 'vitest';

export function createMockRateLimit(success = true): RateLimit {
  return { limit: vi.fn<RateLimit['limit']>(async () => ({ success })) };
}
