import { Errors } from '@orbs/errors/universal';
import type { TenantActionUpdateRoomParams, TenantRoomSummary, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionUpdateRoom(deps: TenantServiceDeps, params: TenantActionUpdateRoomParams): Promise<TenantRoomSummary> {
  const tenant = deps.namespace.getByName(params.organizationId);
  const current = await tenant.roomGet({ roomId: params.roomId });

  if (current?.kind === 'direct' && (params.name !== undefined || params.botIds !== undefined)) {
    throw new Errors.FORBIDDEN();
  }

  const room = await tenant.roomUpdate({
    roomId: params.roomId,
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
