import { tenantSendResult } from './tenant.utils';
import type { RoomSendResult } from '#/types/room.types';
import type { TenantActionRerunParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionRerun(deps: TenantServiceDeps, params: TenantActionRerunParams): Promise<RoomSendResult> {
  return tenantSendResult(await deps.namespace.getByName(params.organizationId).roomRerun({
    roomId: params.roomId,
    userId: params.userId,
    userName: params.userName,
  }));
}
