import { describe, expect } from 'vitest';
import { authKit } from '../../kits/auth.kit';
import { organizationKit } from '../../kits/organization.kit';
import { authSessionHeaders } from '../../support/auth';
import { createKitTest } from '../../test';

const test = createKitTest((testD1) => ({ auth: authKit.bind(testD1), organization: organizationKit.bind(testD1) }));

describe('auth.queries.apiKey', () => {
  test('resolves a created key to its tenant', async ({ kit, make, testD1 }) => {
    const user = await make.user();
    const organization = await kit.organization.actions.ensure({ userId: user.id });

    const created = await kit.auth.actions.createApiKey({
      headers: await authSessionHeaders(testD1, user.id),
      organizationId: organization.id,
      name: 'CI',
    });

    const verified = await kit.auth.queries.apiKey({ key: created.key });

    expect(created.key).toMatch(/^orbs_/);
    expect(verified).toEqual({ id: created.id, organizationId: organization.id });
  });

  test('returns null for an unknown or revoked key', async ({ kit, make, testD1 }) => {
    const user = await make.user();
    const organization = await kit.organization.actions.ensure({ userId: user.id });
    const headers = await authSessionHeaders(testD1, user.id);

    const created = await kit.auth.actions.createApiKey({
      headers,
      organizationId: organization.id,
      name: 'Old',
    });

    await kit.auth.actions.deleteApiKey({
      headers,
      organizationId: organization.id,
      keyId: created.id,
    });

    expect(await kit.auth.queries.apiKey({ key: 'orbs_not_a_real_key' })).toBeNull();
    expect(await kit.auth.queries.apiKey({ key: created.key })).toBeNull();
  });
});
