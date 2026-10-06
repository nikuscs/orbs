import { runActionAnnounce } from './run-action.announce';
import { runActionDispatch } from './run-action.dispatch';
import { runQueryGet } from './run-query.get';
import { runQueryRetryable } from './run-query.retryable';
import type { RunActionRetryParams, RunServiceDeps } from '#/types/run.types';

export function runActionRetry(deps: RunServiceDeps, params: RunActionRetryParams): boolean {
  const retryable = runQueryRetryable(deps, params).some((item) => item.id === params.runId);
  const run = retryable ? runQueryGet(deps, params) : undefined;

  if (!run) {
    return false;
  }

  const now = new Date().toISOString();

  deps.database.run(deps.database.db.insertInto('run').values({
    ...run,
    id: crypto.randomUUID(),
    status: 'queued',
    failure: null,
    activity: 'thinking',
    activeTools: 0,
    contextThrough: null,
    acceptedAt: null,
    createdAt: now,
    updatedAt: now,
  }));
  runActionAnnounce(deps, { roomId: run.roomId });
  runActionDispatch(deps);

  return true;
}
