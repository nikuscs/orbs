import { memoryCaptureActionControl } from './memory-capture-action.control';
import { memoryCaptureActionDispatch } from './memory-capture-action.dispatch';
import { memoryCaptureActionReceive } from './memory-capture-action.receive';
import { memoryCaptureActionTick } from './memory-capture-action.tick';
import { memoryCaptureQueryStatus } from './memory-capture-query.status';
import type { DaemonMemoryResult } from '#/types/daemon.types';
import type * as MemoryCaptureTypes from '#/types/memory-capture.types';

export function makeMemoryCaptureService(deps: MemoryCaptureTypes.MemoryCaptureServiceDeps) {
  return {
    queries: { status: (params: MemoryCaptureTypes.MemoryCaptureQueryStatusParams) => memoryCaptureQueryStatus(deps, params) },
    actions: {
      dispatch: (params: MemoryCaptureTypes.MemoryCaptureActionDispatchParams) => memoryCaptureActionDispatch(deps, params),
      control: (params: MemoryCaptureTypes.MemoryCaptureControlInput) => memoryCaptureActionControl(deps, params),
      tick: () => memoryCaptureActionTick(deps),
      receive: (params: DaemonMemoryResult) => memoryCaptureActionReceive(deps, params),
    },
  };
}

export type MemoryCaptureService = ReturnType<typeof makeMemoryCaptureService>;
