import { Errors } from '@orbs/errors/universal';
import type { TenantActionCreateRoomParams, TenantRoomSummary, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionCreateRoom(deps: TenantServiceDeps, params: TenantActionCreateRoomParams): Promise<TenantRoomSummary> {
  const room = await deps.namespace.getByName(params.organizationId).roomCreate({
    name: params.name,
    botIds: params.botIds,
    description: params.description,
    driver: params.driver,
    sendMode: params.sendMode,
  });

  if (!room) {
    throw new Errors.NOT_FOUND();
  }

  return room;
}
