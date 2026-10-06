import { Errors } from '@orbs/errors/universal';
import { memoryCaptureSkipped } from '#/types/memory-capture.types';
import { roomLastSeq } from '#services/room/room.utils';
import type { MemoryCaptureControlInput, MemoryCaptureServiceDeps } from '#/types/memory-capture.types';

export function memoryCaptureActionControl(deps: MemoryCaptureServiceDeps, params: MemoryCaptureControlInput): void {
  if (!deps.database.all(deps.database.db.selectFrom('room').select('id').where('id', '=', params.roomId)).length) {
    throw new Errors.NOT_FOUND({ resource: 'room' });
  }

  const current = deps.database.all(deps.database.db.selectFrom('memoryRoom').selectAll().where('roomId', '=', params.roomId)).at(0);

  if (params.action === 'enable') {
    deps.database.run(
      deps.database.db
        .insertInto('memoryRoom')
        .values({
          roomId: params.roomId,
          enabled: 1,
          generation: crypto.randomUUID(),
          cursor: roomLastSeq(deps.database, params.roomId),
          throughSeq: 0,
          fromSeq: 0,
          offset: 0,
          status: 'idle',
          dueAt: null,
          attempt: 0,
          requestId: null,
          model: null,
          source: null,
          result: null,
          error: null,
          recap: '',
          recapFrom: 0,
          recapThrough: 0,
          recapRevision: 0,
          baseRecapRevision: 0,
          usage: null,
          skipped: '[]',
        })
        .onConflict((conflict) => conflict.column('roomId').doNothing()),
    );

    if (current?.enabled === 0) {
      deps.database.run(
        deps.database.db
          .updateTable('memoryRoom')
          .set({
            enabled: 1,
            offset: 0,
            attempt: 0,
            error: null,
            throughSeq: 0,
            fromSeq: 0,
            generation: crypto.randomUUID(),
            status: 'idle',
            cursor: roomLastSeq(deps.database, params.roomId),
            dueAt: null,
            requestId: null,
            source: null,
            result: null,
            recap: '',
            recapFrom: 0,
            recapThrough: 0,
          })
          .where('roomId', '=', params.roomId),
      );
    }
  } else if (params.action === 'disable') {
    deps.database.run(
      deps.database.db
        .updateTable('memoryRoom')
        .set({
          enabled: 0,
          generation: crypto.randomUUID(),
          status: 'idle',
          dueAt: null,
          requestId: null,
          result: null,
          source: null,
        })
        .where('roomId', '=', params.roomId),
    );
  } else if (current?.status === 'paused') {
    if (params.action === 'skip' && !current.source) {
      throw new Errors.CONFLICT();
    }

    const cursor = params.action === 'skip' ? Math.max(current.cursor, current.throughSeq) : current.cursor;
    deps.database.run(
      deps.database.db
        .updateTable('memoryRoom')
        .set({
          status: 'pending',
          cursor,
          dueAt: Date.now(),
          attempt: 0,
          error: null,
          requestId: params.action === 'retry' && current.result ? current.requestId : null,
          offset: params.action === 'skip' ? 0 : current.offset,
          source: params.action === 'skip' ? null : current.source,
          result: params.action === 'skip' ? null : current.result,
          skipped: params.action === 'skip'
            ? JSON.stringify([
              ...memoryCaptureSkipped.parse(JSON.parse(current.skipped)),
              { from: current.fromSeq, through: current.throughSeq, reason: current.error },
            ])
            : current.skipped,
          recap: params.action === 'skip' ? '' : current.recap,
          recapFrom: params.action === 'skip' ? 0 : current.recapFrom,
          recapThrough: params.action === 'skip' ? 0 : current.recapThrough,
        })
        .where('roomId', '=', params.roomId),
    );
    deps.alarm.set(Date.now());
  }

  deps.sockets.broadcast({ type: 'memory.updated' });
}
