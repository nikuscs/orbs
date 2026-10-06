import { Errors } from '@orbs/errors/universal';
import type { RoomReactionResult } from '#/types/room.types';
import type { TenantActionRemoveReactionParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionRemoveReaction(deps: TenantServiceDeps, params: TenantActionRemoveReactionParams): Promise<RoomReactionResult> {
  const result = await deps.namespace.getByName(params.organizationId).roomRemoveReaction({
    roomId: params.roomId,
    reactionId: params.reactionId,
    userId: params.userId,
  });

  if (result === 'forbidden') {
    throw new Errors.FORBIDDEN();
  }

  if (!result) {
    throw new Errors.NOT_FOUND();
  }

  return result;
}
