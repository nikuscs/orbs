import { log } from '@orbs/logger/server';
import type { RoomActionDeleteParams, RoomDeleteResult, RoomServiceDeps } from '#/types/room.types';

export function roomActionDelete(deps: RoomServiceDeps, params: RoomActionDeleteParams): RoomDeleteResult {
  const { db } = deps.database;

  const room = deps.database.all(db.selectFrom('room').select('kind').where('id', '=', params.roomId)).at(0);

  if (!room) {
    return null;
  }

  if (room.kind !== params.kind) {
    return 'direct';
  }

  const sessionFiles = deps.database
    .all(
      db
        .selectFrom('binding')
        .select('resume')
        .where('roomId', '=', params.roomId)
        .union(db.selectFrom('judge').select('resume').where('roomId', '=', params.roomId)),
    )
    .map((session) => session.resume);

  deps.run.actions.stop({ roomId: params.roomId });

  deps.database.transaction(() => {
    deps.database.run(
      db
        .insertInto('memorySnapshot')
        .values({
          scope: 'room',
          ownerId: params.roomId,
          text: '',
          dirty: 1,
          dueAt: Date.now(),
        })
        .onConflict((conflict) =>
          conflict.columns(['scope', 'ownerId']).doUpdateSet({
            text: '',
            dirty: 1,
            dueAt: Date.now(),
          }),
        ),
    );
    deps.database.run(db.deleteFrom('memoryRoom').where('roomId', '=', params.roomId));

    const runIds = db.selectFrom('run').select('id').where('roomId', '=', params.roomId);

    const messageIds = db.selectFrom('message').select('id').where('roomId', '=', params.roomId);

    deps.database.run(db.deleteFrom('chunk').where('runId', 'in', runIds));
    deps.database.run(db.deleteFrom('routing').where('messageId', 'in', messageIds));
    deps.database.run(db.deleteFrom('run').where('roomId', '=', params.roomId));
    deps.database.run(db.deleteFrom('binding').where('roomId', '=', params.roomId));
    deps.database.run(db.deleteFrom('judge').where('roomId', '=', params.roomId));
    deps.database.run(db.deleteFrom('reaction').where('roomId', '=', params.roomId));
    deps.database.run(db.deleteFrom('file').where('roomId', '=', params.roomId));
    deps.database.run(db.deleteFrom('message').where('roomId', '=', params.roomId));
    deps.database.run(db.deleteFrom('member').where('roomId', '=', params.roomId));
    deps.database.run(db.deleteFrom('room').where('id', '=', params.roomId));
  });
  deps.sockets.broadcast({ type: 'room.deleted', roomId: params.roomId });
  deps.sockets.daemon()?.send({
    type: 'room.deleted',
    roomId: params.roomId,
    sessionFiles,
  });

  async function roomRemoveFiles(): Promise<void> {
    try {
      await deps.storage.actions.removeRoom({ organizationId: deps.organizationId, roomId: params.roomId });
    } catch (error) {
      log.error({
        tag: 'file',
        message: 'deleted room file cleanup failed',
        roomId: params.roomId,
        error,
      });
    }
  }

  deps.waitUntil(roomRemoveFiles());
  deps.run.actions.dispatch();
  deps.run.actions.arm();

  return 'deleted';
}
