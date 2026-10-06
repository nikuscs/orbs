import type { RunActionAcceptParams, RunServiceDeps } from '#/types/run.types';

export function runActionAccept(deps: RunServiceDeps, params: RunActionAcceptParams): void {
  const acceptedAt = new Date().toISOString();

  deps.database.run(deps.database.db
    .updateTable('run')
    .set({ acceptedAt, updatedAt: acceptedAt })
    .where('id', '=', params.runId)
    .where('status', '=', 'running')
    .where('acceptedAt', 'is', null));
}
