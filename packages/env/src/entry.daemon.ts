import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const envDaemonSchema = {
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ORBS_URL: z.url({ protocol: /^https?$/ }).default('http://localhost:47101'),
  ORBS_API_KEY: z.string().min(1),
  ORBS_WORKDIR: z.string().min(1),
  ORBS_SHARED_HOME: z.string().min(1).default('~/.orbs/shared'),
  ORBS_MAX_TURNS: z.coerce.number().int().min(1).default(4),
};

export function envDaemon(runtimeEnv: Record<string, string | undefined>) {
  return createEnv({
    server: envDaemonSchema,
    runtimeEnv,
    emptyStringAsUndefined: true,
  });
}

export type EnvDaemon = ReturnType<typeof envDaemon>;
