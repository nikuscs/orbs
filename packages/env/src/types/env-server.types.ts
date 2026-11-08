import { z } from 'zod';

export const envServerSchema = {
  APP_NAME: z.string().trim().min(1).default('Orbs'),
  DATA_DIR: z.string().trim().min(1).default('~/.config/orbs/'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  DAEMON_HOST: z.string().trim().min(1).default('0.0.0.0'),
  DAEMON_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DAEMON_ALLOWED_ORIGINS: z.string().trim().default('')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean)
      .map((origin) => URL.parse(origin)?.origin ?? origin)),

  WEB_HOST: z.string().trim().min(1).default('127.0.0.1'),
  WEB_PORT: z.coerce.number().int().min(1).max(65535).default(47190),
  WEB_PUBLIC_URL: z.url({ protocol: /^https?$/ }).default('http://127.0.0.1:47190'),

  MOBILE_SCHEME: z.string().trim().min(1).default('orbs'),

  DOCKER_HOST: z.string().trim().min(1).optional(),
};
