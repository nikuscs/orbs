import { STORAGE } from '#services/storage/storage.constants';
import type { RoomActionRemoveFileParams, RoomRemoveFileResult, RoomServiceDeps } from '#/types/room.types';

export async function roomActionRemoveFile(deps: RoomServiceDeps, params: RoomActionRemoveFileParams): Promise<RoomRemoveFileResult> {
  const file = deps.database.all(deps.database.db
    .selectFrom('file')
    .select('messageId')
    .where('id', '=', params.fileId)
    .where('roomId', '=', params.roomId)).at(0);

  if (!file) {
    return null;
  }

  if (file.messageId !== null) {
    return 'sent';
  }

  deps.database.run(deps.database.db.deleteFrom('file').where('id', '=', params.fileId));
  await deps.storage.actions.removeKeys({ keys: [`${STORAGE.roomKey(deps.organizationId, params.roomId)}${params.fileId}`] });

  return 'removed';
}
