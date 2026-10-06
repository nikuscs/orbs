import { describe, expect } from 'vitest';
import { organizationKit } from '../../kits/organization.kit';
import { createKitTest } from '../../test';

const test = createKitTest((testD1) => ({ organization: organizationKit.bind(testD1) }));

describe('organization.actions.ensure', () => {
  test('creates a personal organization with the owner', async ({ kit, make, db }) => {
    const user = await make.user({ name: 'Ada' });

    const organization = await kit.organization.actions.ensure({ userId: user.id });

    expect(organization.name).toContain('Ada');
    expect(await db
      .selectFrom('member')
      .select(['userId', 'organizationId'])
      .execute()).toEqual([{ userId: user.id, organizationId: organization.id }]);
  });

  test('returns the same organization on later calls', async ({ kit, make }) => {
    const user = await make.user();

    const first = await kit.organization.actions.ensure({ userId: user.id });
    const second = await kit.organization.actions.ensure({ userId: user.id });

    expect(second.id).toBe(first.id);
  });
});
