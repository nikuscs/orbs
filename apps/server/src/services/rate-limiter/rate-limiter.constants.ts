export const RATE_LIMITER = {
  rpc: { maxRequests: 100, window: 60_000 },
  auth: { maxRequests: 30, window: 60_000 },
  ingest: { maxRequests: 120, window: 60_000 },
} as const;
