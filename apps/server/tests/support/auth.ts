import { sql } from 'kysely';
import { TEST_ENV } from './env';
import type { TestD1 } from './database';

export async function authSessionHeaders(testD1: TestD1, userId: string) {
  const token = crypto.randomUUID().replaceAll('-', '');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 86_400_000).toISOString();

  await sql`insert into "session" ("id", "token", "userId", "expiresAt", "createdAt", "updatedAt") values (${`session-${token}`}, ${token}, ${userId}, ${expiresAt}, ${now.toISOString()}, ${now.toISOString()})`.execute(testD1.database.db);

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(TEST_ENV.BETTER_AUTH_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token))).toString('base64');

  return new Headers({ cookie: `orbs.session_token=${encodeURIComponent(`${token}.${signature}`)}`, origin: TEST_ENV.APP_URL });
}
