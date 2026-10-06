import { authBan } from '#services/auth/auth.utils';
import { ORGANIZATION } from './organization.constants';
import type { AuthBan } from '#/types/auth.types';
import type { OrganizationQueryBanParams, OrganizationServiceDeps } from '#/types/organization.types';

export async function organizationQueryBan(deps: OrganizationServiceDeps, params: OrganizationQueryBanParams): Promise<AuthBan | null> {
  const owners = await deps.database.db
    .selectFrom('member')
    .innerJoin('user', 'user.id', 'member.userId')
    .select(['user.banned', 'user.banExpires'])
    .where('member.organizationId', '=', params.organizationId)
    .where('member.role', '=', ORGANIZATION.defaultRole)
    .where('user.banned', '=', 1)
    .execute();

  return owners.map((owner) => authBan(owner)).find((ban) => ban !== null) ?? null;
}
