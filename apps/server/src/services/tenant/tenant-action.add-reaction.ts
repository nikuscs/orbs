import { Errors } from '@orbs/errors/universal';
import type { RoomReactionResult } from '#/types/room.types';
import type { TenantActionAddReactionParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionAddReaction(deps: TenantServiceDeps, params: TenantActionAddReactionParams): Promise<RoomReactionResult> {
  const result = await deps.namespace.getByName(params.organizationId).roomAddReaction({
    roomId: params.roomId,
    messageId: params.messageId,
    reactionId: params.reactionId,
    emoji: params.emoji,
    userId: params.userId,
    userName: params.userName,
  });

  if (result === 'conflict') {
    throw new Errors.CONFLICT();
  }

  if (!result) {
    throw new Errors.NOT_FOUND();
  }

  return result;
}
