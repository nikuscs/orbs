import { Errors } from '@orbs/errors/universal';
import { roomQueryGet } from './room-query.get';
import { ROOM } from './room.constants';
import { roomMemberKey } from './room.utils';
import type { RoomActionOpenDirectParams, RoomServiceDeps } from '#/types/room.types';
import type { TenantRoomSummary } from '#/types/tenant.types';

export async function roomActionOpenDirect(deps: RoomServiceDeps, params: RoomActionOpenDirectParams): Promise<TenantRoomSummary | null> {
  const bot = await deps.bot.queries.get({ organizationId: deps.organizationId, botId: params.botId });

  if (!bot) {
    return null;
  }

  const roomId = `${ROOM.directIdPrefix}${params.botId}`;
  const createdAt = new Date().toISOString();
  const { db } = deps.database;

  deps.database.transaction(() => {
    deps.database.run(db
      .insertInto('room')
      .values({
        id: roomId,
        kind: 'direct',
        name: bot.name,
        memberKey: roomMemberKey([params.botId]),
        leaderBotId: null,
        stoppedThrough: null,
        createdAt,
      })
      .onConflict((conflict) => conflict.doNothing()));
    deps.database.run(db
      .insertInto('member')
      .values({
        roomId,
        botId: params.botId,
        createdAt,
      })
      .onConflict((conflict) => conflict.doNothing()));
  });

  const room = roomQueryGet(deps, { roomId });

  if (!room) {
    throw new Errors.INTERNAL_ERROR({ internal: `Direct room ${roomId} missing after insert` });
  }

  return room;
}
