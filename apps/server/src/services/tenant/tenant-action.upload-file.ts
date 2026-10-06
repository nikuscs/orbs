import { Errors } from '@orbs/errors/universal';
import { roomFileName } from '#services/room/room.utils';
import { STORAGE } from '#services/storage/storage.constants';
import type { RoomUploadResult } from '#/types/room.types';
import type { TenantActionUploadFileParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionUploadFile(deps: TenantServiceDeps, params: TenantActionUploadFileParams): Promise<RoomUploadResult> {
  const fileId = crypto.randomUUID();
  const file = { id: fileId, name: roomFileName(params.file.name), mediaType: params.file.type, size: params.file.size };

  await deps.storage.actions.put({
    organizationId: params.organizationId,
    roomId: params.roomId,
    fileId,
    file: params.file,
  });

  const added = await deps.namespace.getByName(params.organizationId).roomAddFile({ roomId: params.roomId, file });

  if (!added) {
    await deps.storage.actions.removeKeys({ keys: [`${STORAGE.roomKey(params.organizationId, params.roomId)}${fileId}`] });
    throw new Errors.NOT_FOUND({ resource: 'room' });
  }

  return file;
}
