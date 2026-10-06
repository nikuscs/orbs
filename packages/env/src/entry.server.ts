import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const envServerSchema = {
  APP_URL: z.url(),
  APP_TRUSTED_ORIGINS: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  TYPESAFE_API_KEY: z.string().min(1),
  ORBS_DATA_ROOT: z.string().min(1).optional(),
  DEBUG_QUERIES: z.stringbool().default(false),
  MAIL_DRIVER: z.enum(['terminal', 'cloudflare']).default('terminal'),
  MAIL_FROM_NAME: z.string().min(1).default('Orbs'),
  MAIL_FROM_EMAIL: z.email().default('no-reply@orbs.local'),
  MAIL_CLOUDFLARE_ACCOUNT_ID: z.string().min(1).optional(),
  MAIL_CLOUDFLARE_TOKEN: z.string().min(1).optional(),
  HOST: z.string().min(1).default('::'),
  ASSET_PRELOAD_MAX_SIZE: z.coerce.number().int().min(0).default(5 * 1024 * 1024),
  ASSET_PRELOAD_INCLUDE_PATTERNS: z.string().optional(),
  ASSET_PRELOAD_EXCLUDE_PATTERNS: z.string().optional(),
  ASSET_PRELOAD_ENABLE_ETAG: z.stringbool().default(true),
  ASSET_PRELOAD_ENABLE_GZIP: z.stringbool().default(false),
  ASSET_PRELOAD_GZIP_MIN_SIZE: z.coerce.number().int().min(0).default(1024),
  ASSET_PRELOAD_GZIP_MIME_TYPES: z.string().default('text/,application/javascript,application/json,application/xml,image/svg+xml'),
};

export function envServer(runtimeEnv: Record<string, string | undefined>) {
  return createEnv({
    server: envServerSchema,
    runtimeEnv,
    emptyStringAsUndefined: true,
  });
}

export type EnvServer = ReturnType<typeof envServer>;
