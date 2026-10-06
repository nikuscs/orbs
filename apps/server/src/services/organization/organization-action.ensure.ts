import { Errors } from '@orbs/errors/universal';
import { organizationQueryActive } from './organization-query.active';
import { ORGANIZATION } from './organization.constants';
import type { DatabaseOrganization } from '#/types/database.types';
import type { OrganizationActionEnsureParams, OrganizationServiceDeps } from '#/types/organization.types';

export async function organizationActionEnsure(deps: OrganizationServiceDeps, params: OrganizationActionEnsureParams): Promise<DatabaseOrganization> {
  const existing = await organizationQueryActive(deps, params);

  if (existing) {
    return existing;
  }

  const user = await deps.database.db
    .selectFrom('user')
    .select('name')
    .where('id', '=', params.userId)
    .executeTakeFirst();

  const createdAt = new Date().toISOString();

  const organization: DatabaseOrganization = {
    id: crypto.randomUUID(),
    name: user?.name ? `${user.name} ${ORGANIZATION.defaultNameWithUser}` : ORGANIZATION.defaultName,
    slug: `${ORGANIZATION.slugPrefix}${params.userId}`,
    logo: null,
    metadata: null,
    createdAt,
  };

  try {
    await deps.database.batch([
      deps.database.db.insertInto('organization').values(organization),
      deps.database.db.insertInto('member').values({
        id: crypto.randomUUID(),
        organizationId: organization.id,
        userId: params.userId,
        role: ORGANIZATION.defaultRole,
        createdAt,
      }),
    ]);

    return organization;
  } catch (cause) {
    const concurrent = await organizationQueryActive(deps, { userId: params.userId });

    if (!concurrent) {
      throw new Errors.INTERNAL_ERROR({ internal: 'Personal organization could not be created', cause });
    }

    return concurrent;
  }
}
