import { envServer } from '@orbs/env/server';

export const TEST_ENV = envServer({
  APP_URL: 'http://localhost:47101',
  BETTER_AUTH_SECRET: 'orbs-test-secret-with-enough-entropy-000',
  GOOGLE_CLIENT_ID: 'test-google-client',
  GOOGLE_CLIENT_SECRET: 'test-google-secret',
  TYPESAFE_API_KEY: 'test-typesafe-key',
});
