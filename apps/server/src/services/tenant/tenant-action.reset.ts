import { Errors } from '@orbs/errors/universal';
import type { TenantActionResetParams, TenantRoomSummary, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionReset(deps: TenantServiceDeps, params: TenantActionResetParams): Promise<TenantRoomSummary> {
  const room = await deps.namespace.getByName(params.organizationId).roomReset({ roomId: params.roomId, botIds: params.botIds });

  if (room === 'busy') {
    throw new Errors.CONFLICT();
  }

  if (!room) {
    throw new Errors.NOT_FOUND();
  }

  return room;
}
