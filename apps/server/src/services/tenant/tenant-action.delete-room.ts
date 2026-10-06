import { Errors } from '@orbs/errors/universal';
import type { TenantActionDeleteRoomParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionDeleteRoom(deps: TenantServiceDeps, params: TenantActionDeleteRoomParams): Promise<void> {
  const result = await deps.namespace.getByName(params.organizationId).roomDelete({ roomId: params.roomId, kind: 'group' });

  if (result === 'direct') {
    throw new Errors.FORBIDDEN();
  }

  if (!result) {
    throw new Errors.NOT_FOUND();
  }
}
