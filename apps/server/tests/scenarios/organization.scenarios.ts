import type { BoundFactories } from '../factories';

export const organizationScenarios = {
  userWithOrganization: async (make: BoundFactories, user: Parameters<BoundFactories['user']>[0] = {}) => {
    const created = await make.user(user);
    const organization = await make.organization();
    await make.member({ organizationId: organization.id, userId: created.id });

    return { user: created, organization };
  },
};
