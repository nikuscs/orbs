import { call } from '@orpc/server';
import { describe, expect } from 'vitest';
import admin from '#/rpc/rpc.admin';
import { authSessionHeaders } from '../support/auth';
import { rpcContext } from '../support/rpc';
import { createKitTest } from '../test';

const test = createKitTest(() => ({}));

describe('rpc.admin', () => {
  test('refuses admin procedures to a user without the admin role', async ({ make, scenarios, testD1 }) => {
    const { user } = await scenarios.userWithOrganization();
    const target = await make.user();
    const context = rpcContext(testD1, await authSessionHeaders(testD1, user.id));

    await expect(call(admin.users.list, {}, { context })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(call(admin.users.ban, { userId: target.id }, { context })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('lets an admin find users by email', async ({ make, scenarios, testD1 }) => {
    const { user: adminUser } = await scenarios.userWithOrganization({ role: 'admin' });
    await make.user({ email: 'ada@lovelace.test' });
    await make.user({ email: 'grace@hopper.test' });
    const context = rpcContext(testD1, await authSessionHeaders(testD1, adminUser.id));

    const result = await call(admin.users.list, { search: 'lovelace' }, { context });

    expect(result).toMatchObject({ total: 1, users: [{ email: 'ada@lovelace.test', ban: null }] });
  });

  test('bans and unbans a user', async ({ scenarios, testD1 }) => {
    const { user: adminUser } = await scenarios.userWithOrganization({ role: 'admin' });
    const { user } = await scenarios.userWithOrganization();
    const context = rpcContext(testD1, await authSessionHeaders(testD1, adminUser.id));

    await call(admin.users.ban, { userId: user.id, reason: 'abuse' }, { context });
    let result = await call(admin.users.list, { search: user.email }, { context });
    expect(result.users[0]).toMatchObject({ ban: { until: null }, banReason: 'abuse' });

    await call(admin.users.unban, { userId: user.id }, { context });
    result = await call(admin.users.list, { search: user.email }, { context });
    expect(result.users[0]?.ban).toBeNull();
  });

  test('a timed ban records when it ends', async ({ make, scenarios, testD1 }) => {
    const { user: adminUser } = await scenarios.userWithOrganization({ role: 'admin' });
    const user = await make.user();
    const context = rpcContext(testD1, await authSessionHeaders(testD1, adminUser.id));

    await call(admin.users.ban, { userId: user.id, expiresInDays: 7 }, { context });
    const { users } = await call(admin.users.list, { search: user.email }, { context });
    const until = new Date(users[0]?.ban?.until ?? 0).getTime();

    expect(until).toBeGreaterThan(Date.now() + 6.9 * 86_400_000);
    expect(until).toBeLessThan(Date.now() + 7.1 * 86_400_000);
  });
});
