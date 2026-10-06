import { tenantSendResult } from './tenant.utils';
import type { RoomSendResult } from '#/types/room.types';
import type { TenantActionSendParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionSend(deps: TenantServiceDeps, params: TenantActionSendParams): Promise<RoomSendResult> {
  return tenantSendResult(await deps.namespace.getByName(params.organizationId).roomSend({
    roomId: params.roomId,
    messageId: params.messageId,
    text: params.text,
    fileIds: params.fileIds,
    replyToMessageId: params.replyToMessageId,
    userId: params.userId,
    userName: params.userName,
  }));
}
