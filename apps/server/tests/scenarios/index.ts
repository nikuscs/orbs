import { organizationScenarios } from './organization.scenarios';
import type { BoundFactories } from '../factories';

export const scenarios = {
  bind(make: BoundFactories) {
    return {
      userWithOrganization: (user?: Parameters<BoundFactories['user']>[0]) => organizationScenarios.userWithOrganization(make, user),
    };
  },
};

export type BoundScenarios = ReturnType<typeof scenarios.bind>;
