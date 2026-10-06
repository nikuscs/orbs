import type { RoomQueryGetParams, RoomServiceDeps } from '#/types/room.types';
import type { TenantRoomSummary } from '#/types/tenant.types';

export function roomQueryGet(deps: RoomServiceDeps, params: RoomQueryGetParams): TenantRoomSummary | undefined {
  const { db } = deps.database;

  const room = deps.database.all(db
    .selectFrom('room')
    .selectAll()
    .where('id', '=', params.roomId)).at(0);

  if (!room) {
    return undefined;
  }

  const members = deps.database.all(db
    .selectFrom('member')
    .select(['botId', 'freshFrom'])
    .where('roomId', '=', room.id)
    .orderBy('createdAt'));

  return {
    ...room,
    botIds: members.map((member) => member.botId),
    fresh: members.filter((member) => member.freshFrom > 0).map((member) => ({ botId: member.botId, seq: member.freshFrom })),
  };
}
