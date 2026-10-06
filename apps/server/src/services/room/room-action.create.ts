import { roomMemberKey, roomOwnBots } from './room.utils';
import type { DatabaseTenantRoom } from '#/types/database-tenant.types';
import type { RoomActionCreateParams, RoomServiceDeps } from '#/types/room.types';
import type { TenantRoomSummary } from '#/types/tenant.types';

export async function roomActionCreate(deps: RoomServiceDeps, params: RoomActionCreateParams): Promise<TenantRoomSummary | null> {
  if (!await roomOwnBots(deps, params.botIds)) {
    return null;
  }

  const createdAt = new Date().toISOString();

  const room: DatabaseTenantRoom = {
    id: crypto.randomUUID(),
    kind: 'group',
    name: params.name,
    memberKey: roomMemberKey(params.botIds),
    leaderBotId: params.botIds.at(0) ?? null,
    description: params.description,
    stoppedThrough: null,
    pinned: 0,
    position: null,
    driver: params.driver,
    sendMode: params.sendMode,
    rotation: 0,
    createdAt,
  };

  const { db } = deps.database;

  deps.database.transaction(() => {
    deps.database.run(db.insertInto('room').values(room));
    deps.database.run(db.insertInto('member').values(params.botIds.map((botId) => ({ roomId: room.id, botId, createdAt }))));
  });
  deps.sockets.broadcast({ type: 'room.updated', roomId: room.id });

  return { ...room, botIds: params.botIds, fresh: [] };
}
