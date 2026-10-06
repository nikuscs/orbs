import { roomActionSweepFiles } from './room-action.sweep-files';
import { roomQueryGet } from './room-query.get';
import type { RoomActionAddFileParams, RoomServiceDeps } from '#/types/room.types';

export function roomActionAddFile(deps: RoomServiceDeps, params: RoomActionAddFileParams): 'added' | null {
  roomActionSweepFiles(deps);

  const room = roomQueryGet(deps, params);

  if (!room) {
    return null;
  }

  deps.database.run(deps.database.db.insertInto('file').values({
    ...params.file,
    roomId: params.roomId,
    messageId: null,
    createdAt: new Date().toISOString(),
  }));

  return 'added';
}
