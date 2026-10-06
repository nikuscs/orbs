import { roomOrder, roomPreview } from './room.utils';
import type { RoomServiceDeps } from '#/types/room.types';
import type { TenantRoomListItem } from '#/types/tenant.types';

export function roomQueryList(deps: RoomServiceDeps): TenantRoomListItem[] {
  const { db } = deps.database;

  const rooms = deps.database.all(db
    .selectFrom('room')
    .leftJoin('message as latest', (join) => join.on('latest.id', '=', (eb) => eb
      .selectFrom('message')
      .select('id')
      .whereRef('message.roomId', '=', 'room.id')
      .where('reactionId', 'is', null)
      .orderBy('seq', 'desc')
      .limit(1)))
    .selectAll('room')
    .select(['latest.authorName as lastAuthor', 'latest.parts as lastParts', 'latest.createdAt as lastCreated']));

  const members = deps.database.all(db
    .selectFrom('member')
    .select(['roomId', 'botId', 'freshFrom'])
    .orderBy('createdAt'));

  const items = rooms.map(({ lastAuthor, lastParts, lastCreated, ...room }) => {
    const own = members.filter((member) => member.roomId === room.id);

    return {
      ...room,
      botIds: own.map((member) => member.botId),
      fresh: own.filter((member) => member.freshFrom > 0).map((member) => ({ botId: member.botId, seq: member.freshFrom })),
      lastMessage: lastAuthor !== null && lastParts !== null && lastCreated !== null
        ? roomPreview({
          authorName: lastAuthor,
          parts: lastParts,
          createdAt: lastCreated,
        })
        : null,
    };
  });

  return items.sort(roomOrder);
}
