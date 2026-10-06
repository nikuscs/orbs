import { runActionAbort } from './run-action.abort';
import { runActionInterrupt } from './run-action.interrupt';
import { runActionReceive } from './run-action.receive';
import { runActionStart } from './run-action.start';
import type { RunServiceDeps } from '#/types/run.types';
import type { DaemonInterruptMessage, DaemonServerMessage, DaemonStartMessage } from '@orbs/server/daemon';

export function makeRunService(deps: RunServiceDeps) {
  return {
    actions: {
      receive: (params: DaemonServerMessage) => runActionReceive(deps, params),
      start: (params: DaemonStartMessage) => runActionStart(deps, params),
      interrupt: (params: DaemonInterruptMessage) => runActionInterrupt(deps, params),
      abort: () => runActionAbort(deps),
    },
  };
}

export type RunService = ReturnType<typeof makeRunService>;
