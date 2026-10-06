import { Errors } from '@orbs/errors/universal';
import { tenantMessages } from './tenant.utils';
import type { RoomUIMessage } from '#/types/room.types';
import type { TenantQueryHistoryParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantQueryHistory(deps: TenantServiceDeps, params: TenantQueryHistoryParams): Promise<RoomUIMessage[]> {
  const rows = await deps.namespace.getByName(params.organizationId).roomHistory({ roomId: params.roomId, before: params.before });

  if (!rows) {
    throw new Errors.NOT_FOUND();
  }

  return tenantMessages(rows);
}
