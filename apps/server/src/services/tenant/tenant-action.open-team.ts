import { Errors } from '@orbs/errors/universal';
import type { TenantActionOpenTeamParams, TenantRoomSummary, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionOpenTeam(deps: TenantServiceDeps, params: TenantActionOpenTeamParams): Promise<TenantRoomSummary> {
  const room = await deps.namespace.getByName(params.organizationId).roomOpenTeam({ name: params.name, botIds: params.botIds });

  if (!room) {
    throw new Errors.NOT_FOUND();
  }

  return room;
}
