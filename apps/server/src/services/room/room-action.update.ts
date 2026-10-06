import { roomQueryGet } from './room-query.get';
import { roomMemberKey, roomOwnBots } from './room.utils';
import type { RoomActionUpdateParams, RoomServiceDeps } from '#/types/room.types';
import type { TenantRoomSummary } from '#/types/tenant.types';

export async function roomActionUpdate(deps: RoomServiceDeps, params: RoomActionUpdateParams): Promise<TenantRoomSummary | null> {
  function roomUpdateMembers(serviceDeps: RoomServiceDeps, roomId: string, botIds: string[]): void {
    const createdAt = new Date().toISOString();
    const { db } = serviceDeps.database;

    serviceDeps.database.transaction(() => {
      serviceDeps.database.run(db
        .deleteFrom('member')
        .where('roomId', '=', roomId)
        .where('botId', 'not in', botIds));
      serviceDeps.database.run(db
        .updateTable('run')
        .set({ status: 'cancelled', updatedAt: createdAt })
        .where('roomId', '=', roomId)
        .where('status', '=', 'queued')
        .where('botId', 'not in', botIds));
      serviceDeps.database.run(db
        .insertInto('member')
        .values(botIds.map((botId) => ({ roomId, botId, createdAt })))
        .onConflict((conflict) => conflict.doNothing()));
      serviceDeps.database.run(db
        .updateTable('room')
        .set({ memberKey: roomMemberKey(botIds), leaderBotId: botIds.at(0) ?? null })
        .where('id', '=', roomId));
    });
  }

  if (params.botIds !== undefined && !await roomOwnBots(deps, params.botIds)) {
    return null;
  }

  if (!roomQueryGet(deps, params)) {
    return null;
  }

  if (params.name !== undefined) {
    deps.database.run(deps.database.db
      .updateTable('room')
      .set({ name: params.name })
      .where('id', '=', params.roomId));
  }

  if (params.botIds !== undefined) {
    roomUpdateMembers(deps, params.roomId, params.botIds);
  }

  if (params.description !== undefined) {
    deps.database.run(deps.database.db
      .updateTable('room')
      .set({ description: params.description })
      .where('id', '=', params.roomId));
  }

  if (params.driver !== undefined) {
    deps.database.run(deps.database.db
      .updateTable('room')
      .set({ driver: params.driver })
      .where('id', '=', params.roomId));
  }

  if (params.sendMode !== undefined) {
    deps.database.run(deps.database.db
      .updateTable('room')
      .set({ sendMode: params.sendMode })
      .where('id', '=', params.roomId));
  }

  deps.sockets.broadcast({ type: 'room.updated', roomId: params.roomId });

  return roomQueryGet(deps, params) ?? null;
}
