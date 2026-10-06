import { organizationQuerySettings } from './organization-query.settings';
import type { OrganizationActionConfigureParams, OrganizationServiceDeps, OrganizationSettings } from '#/types/organization.types';

export async function organizationActionConfigure(deps: OrganizationServiceDeps, params: OrganizationActionConfigureParams): Promise<OrganizationSettings> {
  const updatedAt = new Date().toISOString();

  const rows = Object.entries(params.settings).map(([key, value]) => ({
    organizationId: params.organizationId,
    key,
    value: JSON.stringify(value),
    updatedAt,
    updatedBy: params.userId,
  }));

  if (rows.length > 0) {
    await deps.database.db
      .insertInto('organizationSettings')
      .values(rows)
      .onConflict((conflict) => conflict.columns(['organizationId', 'key']).doUpdateSet((eb) => ({
        value: eb.ref('excluded.value'),
        updatedAt: eb.ref('excluded.updatedAt'),
        updatedBy: eb.ref('excluded.updatedBy'),
      })))
      .execute();
  }

  return organizationQuerySettings(deps, params);
}
