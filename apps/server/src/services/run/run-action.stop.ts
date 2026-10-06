import { roomLastSeq } from '#services/room/room.utils';
import { runActionAnnounce } from './run-action.announce';
import type { RunActionStopParams, RunServiceDeps } from '#/types/run.types';

export function runActionStop(deps: RunServiceDeps, params: RunActionStopParams): void {
  const { db } = deps.database;
  deps.database.run(db
    .updateTable('room')
    .set({ stoppedThrough: roomLastSeq(deps.database, params.roomId) })
    .where('id', '=', params.roomId));

  const runs = deps.database.all(db
    .selectFrom('run')
    .select(['id', 'status', 'acceptedAt'])
    .where('roomId', '=', params.roomId)
    .where('status', 'in', ['queued', 'running']));

  const daemon = deps.sockets.daemon();

  for (const run of runs.filter((item) => item.status === 'running')) {
    daemon?.send({ type: 'run.interrupt', runId: run.id });
  }

  const unconfirmed = runs.filter((item) => item.status === 'queued' || !item.acceptedAt).map((item) => item.id);

  if (unconfirmed.length === 0) {
    return;
  }

  deps.database.run(db
    .updateTable('run')
    .set({ status: 'cancelled', updatedAt: new Date().toISOString() })
    .where('id', 'in', unconfirmed));
  runActionAnnounce(deps, { roomId: params.roomId });
}
