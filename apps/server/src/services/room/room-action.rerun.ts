import { roomActionSend } from './room-action.send';
import { roomMessageFiles, roomMessageText } from './room.utils';
import type { RoomActionRerunParams, RoomSendOutcome, RoomServiceDeps } from '#/types/room.types';

export async function roomActionRerun(deps: RoomServiceDeps, params: RoomActionRerunParams): Promise<RoomSendOutcome> {
  const latest = deps.database.all(deps.database.db
    .selectFrom('message')
    .select(['id', 'parts', 'rerunOf'])
    .where('roomId', '=', params.roomId)
    .where('role', '=', 'user')
    .where('reactionId', 'is', null)
    .orderBy('seq', 'desc')
    .limit(1)).at(0);

  const firstAsking = latest?.rerunOf ?? latest?.id;

  return latest && firstAsking ? roomActionSend(deps, {
    roomId: params.roomId,
    text: roomMessageText(latest.parts),
    fileIds: [],
    rerunFiles: roomMessageFiles(latest.parts),
    rerunOf: firstAsking,
    userId: params.userId,
    userName: params.userName,
  }) : null;
}
