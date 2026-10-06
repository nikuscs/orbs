import { roomActionCreate } from './room-action.create';
import { roomQueryGet } from './room-query.get';
import { roomMemberKey } from './room.utils';
import type { RoomActionOpenTeamParams, RoomServiceDeps } from '#/types/room.types';
import type { TenantRoomSummary } from '#/types/tenant.types';

export async function roomActionOpenTeam(deps: RoomServiceDeps, params: RoomActionOpenTeamParams): Promise<TenantRoomSummary | null> {
  const { db } = deps.database;

  const existing = deps.database.all(db
    .selectFrom('room')
    .select((eb) => [
      'room.id',
      eb.fn.coalesce(eb
        .selectFrom('message')
        .select((inner) => inner.fn.max('message.createdAt').as('at'))
        .whereRef('message.roomId', '=', 'room.id')
        .where('message.reactionId', 'is', null), 'room.createdAt').as('activeAt'),
    ])
    .where('room.kind', '=', 'group')
    .where('room.memberKey', '=', roomMemberKey(params.botIds))
    .orderBy('activeAt', 'desc')
    .limit(1)).at(0);

  const room = existing ? roomQueryGet(deps, { roomId: existing.id }) : undefined;

  return room ?? roomActionCreate(deps, {
    ...params,
    description: '',
    driver: null,
    sendMode: 'queue',
  });
}
