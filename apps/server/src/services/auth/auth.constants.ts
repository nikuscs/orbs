export const AUTH = {
  password: { minLength: 8, maxLength: 128 },
  cookiePrefix: 'orbs',
  daySeconds: 60 * 60 * 24,
  sessionExpiresInSeconds: 60 * 60 * 24 * 7,
  apiKeyHeader: 'x-api-key',
  apiKeyPrefix: 'orbs_',
  adminRole: 'admin',
  adminUsersLimit: 100,
} as const;

