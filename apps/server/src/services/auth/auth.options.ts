import { apiKey } from '@better-auth/api-key';
import { admin, organization, username } from 'better-auth/plugins';
import { SECURITY } from '#services/security/security.constants';
import { AUTH } from './auth.constants';
import type { AuthOptionsParams } from '#/types/auth.types';
import type { BetterAuthOptions } from 'better-auth';

export function authOptions({ env, database, databaseHooks, mail }: AuthOptionsParams) {
  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.APP_URL,
    trustedOrigins: [...(env.APP_TRUSTED_ORIGINS ? env.APP_TRUSTED_ORIGINS.split(',').map((origin) => origin.trim()) : []), env.APP_URL],
    database,
    databaseHooks,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: AUTH.password.minLength,
      maxPasswordLength: AUTH.password.maxLength,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await mail.actions.passwordReset({ to: user.email, url });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await mail.actions.verification({ to: user.email, url });
      },
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google'],
      },
    },
    session: {
      cookieCache: { enabled: true },
      expiresIn: AUTH.sessionExpiresInSeconds,
    },
    rateLimit: { enabled: false },
    advanced: {
      cookiePrefix: AUTH.cookiePrefix,
      database: { generateId: 'uuid', validateSchema: false },
      ipAddress: { ipAddressHeaders: [...SECURITY.ipAddress.headers] },
    },
    plugins: [
      organization(),
      admin(),
      username(),
      apiKey({
        references: 'organization',
        apiKeyHeaders: [AUTH.apiKeyHeader],
        defaultPrefix: AUTH.apiKeyPrefix,
        rateLimit: { enabled: false },
      }),
    ],
  } satisfies BetterAuthOptions;
}
