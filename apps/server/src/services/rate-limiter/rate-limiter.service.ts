import { MemoryRateLimiter } from '@orpc/ratelimit/memory';
import { match } from 'ts-pattern';
import type { RateLimiterServiceSource } from '#/types/rate-limiter.types';
import type { RateLimiter } from '@orpc/ratelimit';

export function makeRateLimiterService(source: RateLimiterServiceSource): RateLimiter {
  return match(source)
    .with({ driver: 'memory' }, ({ policy }) => new MemoryRateLimiter(policy))
    .with({ driver: 'cloudflare' }, ({ binding }): RateLimiter => ({
      limit: async (key) => {
        const { success } = await binding.limit({ key });

        return { success };
      },
    }))
    .exhaustive();
}
