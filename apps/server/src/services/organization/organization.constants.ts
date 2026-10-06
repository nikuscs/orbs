import type { OrganizationSettings } from '#/types/organization.types';

export const ORGANIZATION = {
  defaultName: 'My Organization',
  defaultNameWithUser: 'Organization',
  slugPrefix: 'personal-',
  defaultRole: 'owner',
  settings: { memory: { model: null }, routing: { driver: 'jev', judge: null } } satisfies OrganizationSettings,
} as const;
