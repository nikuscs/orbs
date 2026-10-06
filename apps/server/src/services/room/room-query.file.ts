import type { RoomFile, RoomQueryFileParams, RoomServiceDeps } from '#/types/room.types';

export function roomQueryFile(deps: RoomServiceDeps, params: RoomQueryFileParams): RoomFile | null {
  return deps.database.all(deps.database.db
    .selectFrom('file')
    .select(['roomId', 'name', 'mediaType'])
    .where('id', '=', params.fileId)).at(0) ?? null;
}
