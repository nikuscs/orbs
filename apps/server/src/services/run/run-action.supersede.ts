import { runActionAnnounce } from './run-action.announce';
import type { RunActionSupersedeParams, RunServiceDeps } from '#/types/run.types';

export function runActionSupersede(deps: RunServiceDeps, params: RunActionSupersedeParams): void {
  const { db } = deps.database;

  const older = db
    .selectFrom('message')
    .select('id')
    .where('roomId', '=', params.roomId)
    .where('seq', '<', params.seq);

  const cancelled = deps.database.all(db
    .updateTable('run')
    .set({ status: 'cancelled', updatedAt: new Date().toISOString() })
    .where('roomId', '=', params.roomId)
    .where('status', '=', 'queued')
    .where('seat', '!=', 'required')
    .where('triggerMessageId', 'in', older)
    .returning('id'));

  if (cancelled.length > 0) {
    runActionAnnounce(deps, { roomId: params.roomId });
  }
}
