import type { RATE_LIMITER } from '#services/rate-limiter/rate-limiter.constants';

export type RateLimiterServiceSource =
  | { driver: 'cloudflare'; binding: RateLimit }
  | { driver: 'memory'; policy: (typeof RATE_LIMITER)[keyof typeof RATE_LIMITER] };
