import type { TenantObject } from '#/entry.cloudflare';
import type { EnvServer } from '@orbs/env/server';

export interface CloudflareBindings {
  DB: D1Database;
  FILES: R2Bucket;
  TENANT: DurableObjectNamespace<TenantObject>;
  RPC_RATE_LIMITER: RateLimit;
  AUTH_RATE_LIMITER: RateLimit;
  INGEST_RATE_LIMITER: RateLimit;
}

export interface CloudflareDatabaseParams {
  d1: D1Database;
  env: EnvServer;
}
