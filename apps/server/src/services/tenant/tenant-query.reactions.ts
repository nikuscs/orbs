import type { RoomReactions } from '#/types/room.types';
import type { TenantQueryReactionsParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantQueryReactions(deps: TenantServiceDeps, params: TenantQueryReactionsParams): Promise<RoomReactions> {
  return deps.namespace.getByName(params.organizationId).roomReactions({
    roomId: params.roomId,
    userId: params.userId,
    fromSeq: params.fromSeq,
  });
}
