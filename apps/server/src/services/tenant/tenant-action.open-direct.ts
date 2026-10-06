import { Errors } from '@orbs/errors/universal';
import type { TenantActionOpenDirectParams, TenantRoomSummary, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionOpenDirect(deps: TenantServiceDeps, params: TenantActionOpenDirectParams): Promise<TenantRoomSummary> {
  const room = await deps.namespace.getByName(params.organizationId).roomOpenDirect({ botId: params.botId });

  if (!room) {
    throw new Errors.NOT_FOUND({ resource: 'bot', resourceId: params.botId });
  }

  return room;
}
