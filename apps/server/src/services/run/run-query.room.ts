import { runQueryRetryable } from './run-query.retryable';
import { runRoom } from './run.utils';
import type { RunQueryRoomParams, RunRoom, RunServiceDeps } from '#/types/run.types';

export function runQueryRoom(deps: RunServiceDeps, params: RunQueryRoomParams): RunRoom[] {
  const active = deps.database.all(deps.database.db
    .selectFrom('run')
    .select(['id', 'roomId', 'botId', 'botName', 'status', 'failure', 'activity', 'seat'])
    .where('roomId', '=', params.roomId)
    .where('status', 'in', ['queued', 'running']));

  return [...runQueryRetryable(deps, params), ...active.map(runRoom)];
}
