import { Errors } from '@orbs/errors/universal';
import { roomActionDelete } from './room-action.delete';
import { roomQueryList } from './room-query.list';
import { ROOM } from './room.constants';
import { roomMemberKey } from './room.utils';
import type { RoomActionDeleteBotParams, RoomServiceDeps } from '#/types/room.types';

export async function roomActionDeleteBot(deps: RoomServiceDeps, params: RoomActionDeleteBotParams): Promise<void> {
  const bots = await deps.bot.queries.list({ organizationId: deps.organizationId });

  if (bots.length <= 1) {
    throw new Errors.FORBIDDEN();
  }

  await deps.bot.actions.delete({ organizationId: deps.organizationId, botId: params.botId });

  deps.route.actions.invalidate();
  deps.run.actions.removeBot(params);

  const rooms = roomQueryList(deps).filter(
    (room) => room.botIds.includes(params.botId) || room.id === `${ROOM.directIdPrefix}${params.botId}`,
  );

  const { db } = deps.database;

  deps.database.transaction(() => {
    deps.database.run(db.deleteFrom('memorySnapshot').where('scope', '=', 'bot').where('ownerId', '=', params.botId));
    deps.database.run(db.deleteFrom('binding').where('botId', '=', params.botId));
    deps.database.run(db.deleteFrom('member').where('botId', '=', params.botId));

    for (const room of rooms.filter((item) => item.kind === 'group')) {
      const botIds = room.botIds.filter((botId) => botId !== params.botId);
      const leaderBotId = botIds.find((botId) => botId === room.leaderBotId) ?? botIds.at(0) ?? null;

      deps.database.run(
        db
          .updateTable('room')
          .set({ memberKey: roomMemberKey(botIds), leaderBotId })
          .where('id', '=', room.id),
      );
    }
  });

  for (const room of rooms.filter((item) => item.kind === 'group')) {
    deps.sockets.broadcast({ type: 'room.updated', roomId: room.id });
  }

  for (const room of rooms.filter((item) => item.kind === 'direct')) {
    roomActionDelete(deps, { roomId: room.id, kind: 'direct' });
  }

  deps.sockets.broadcast({ type: 'bot.deleted', botId: params.botId });
  deps.run.actions.dispatch();
  deps.run.actions.arm();
}
