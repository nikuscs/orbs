import { defineFactory } from './factory';

export const organizationFactory = defineFactory('organization', (n) => ({
  id: `organization-${n}`,
  name: `Organization ${n}`,
  slug: `organization-${n}`,
  logo: null,
  metadata: null,
  createdAt: new Date().toISOString(),
}));
