import type { DatabaseOrganization } from '#/types/database.types';
import type { OrganizationQueryActiveParams, OrganizationServiceDeps } from '#/types/organization.types';

export async function organizationQueryActive(
  deps: OrganizationServiceDeps,
  params: OrganizationQueryActiveParams,
): Promise<DatabaseOrganization | undefined> {
  const membership = deps.database.db
    .selectFrom('member')
    .innerJoin('organization', 'organization.id', 'member.organizationId')
    .selectAll('organization')
    .where('member.userId', '=', params.userId);

  if (params.activeOrganizationId) {
    const active = await membership.where('organization.id', '=', params.activeOrganizationId).executeTakeFirst();

    if (active) {
      return active;
    }
  }

  return membership.limit(1).executeTakeFirst();
}
