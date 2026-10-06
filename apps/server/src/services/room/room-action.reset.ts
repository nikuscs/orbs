import { sql } from 'kysely';
import { roomQueryGet } from './room-query.get';
import { roomLastSeq } from './room.utils';
import type { RoomActionResetParams, RoomResetResult, RoomServiceDeps } from '#/types/room.types';

export function roomActionReset(deps: RoomServiceDeps, params: RoomActionResetParams): RoomResetResult {
  const room = roomQueryGet(deps, params);
  const botIds = params.botIds.filter((botId) => room?.botIds.includes(botId));

  if (!room || botIds.length === 0) {
    return null;
  }

  const { db } = deps.database;

  const midTurn = deps.database
    .all(db.selectFrom('run').select('id').where('roomId', '=', params.roomId).where('botId', 'in', botIds).where('status', '=', 'running'))
    .at(0);

  if (midTurn) {
    return 'busy';
  }

  deps.database.transaction(() => {
    deps.database.run(
      db
        .updateTable('memoryRoom')
        .set({
          recap: '',
          recapFrom: roomLastSeq(deps.database, params.roomId) + 1,
          recapThrough: 0,
          recapRevision: sql`recapRevision + 1`,
        })
        .where('roomId', '=', params.roomId),
    );
    deps.database.run(
      db
        .updateTable('member')
        .set({ freshFrom: roomLastSeq(deps.database, params.roomId) })
        .where('roomId', '=', params.roomId)
        .where('botId', 'in', botIds),
    );
    deps.database.run(db.deleteFrom('binding').where('roomId', '=', params.roomId).where('botId', 'in', botIds));
    deps.database.run(
      db
        .updateTable('run')
        .set({ status: 'cancelled', updatedAt: new Date().toISOString() })
        .where('roomId', '=', params.roomId)
        .where('botId', 'in', botIds)
        .where('status', '=', 'queued'),
    );
  });
  deps.run.actions.announce({ roomId: params.roomId });

  return roomQueryGet(deps, params) ?? null;
}
