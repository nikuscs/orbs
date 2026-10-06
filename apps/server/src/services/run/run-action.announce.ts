import { runQueryRoom } from './run-query.room';
import type { RunActionAnnounceParams, RunServiceDeps } from '#/types/run.types';

export function runActionAnnounce(deps: RunServiceDeps, params: RunActionAnnounceParams): void {
  deps.sockets.broadcast({
    type: 'run.updated',
    roomId: params.roomId,
    runs: runQueryRoom(deps, params),
  });
}
