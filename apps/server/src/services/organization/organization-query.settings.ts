import { organizationSettings } from '#/types/organization.types';
import { ORGANIZATION } from './organization.constants';
import type { OrganizationQuerySettingsParams, OrganizationServiceDeps, OrganizationSettings } from '#/types/organization.types';

export async function organizationQuerySettings(deps: OrganizationServiceDeps, params: OrganizationQuerySettingsParams): Promise<OrganizationSettings> {
  const rows = await deps.database.db
    .selectFrom('organizationSettings')
    .select(['key', 'value'])
    .where('organizationId', '=', params.organizationId)
    .execute();

  const stored = organizationSettings.partial().safeParse(Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value)])));

  if (!stored.success) {
    return ORGANIZATION.settings;
  }

  return { ...ORGANIZATION.settings, ...stored.data };
}
