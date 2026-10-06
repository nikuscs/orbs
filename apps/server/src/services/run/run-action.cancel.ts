import { runActionAnnounce } from './run-action.announce';
import type { RunActionCancelParams, RunServiceDeps } from '#/types/run.types';

export function runActionCancel(deps: RunServiceDeps, params: RunActionCancelParams): boolean {
  const { db } = deps.database;

  const run = deps.database.all(db
    .selectFrom('run')
    .select('id')
    .where('id', '=', params.runId)
    .where('roomId', '=', params.roomId)
    .where('status', '=', 'queued')).at(0);

  if (!run) {
    return false;
  }

  deps.database.run(db
    .updateTable('run')
    .set({ status: 'cancelled', updatedAt: new Date().toISOString() })
    .where('id', '=', run.id));
  runActionAnnounce(deps, { roomId: params.roomId });

  return true;
}
