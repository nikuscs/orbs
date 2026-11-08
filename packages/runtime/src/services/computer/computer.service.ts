import { computerActionHandoff } from './computer-action.handoff';
import { computerActionReleaseControl } from './computer-action.release-control';
import { computerActionShutdown } from './computer-action.shutdown';
import { computerActionSleep } from './computer-action.sleep';
import { computerActionStart } from './computer-action.start';
import { computerActionTakeControl } from './computer-action.take-control';
import { computerActionThumbnail } from './computer-action.thumbnail';
import { computerActionTouch } from './computer-action.touch';
import { computerActionViewer } from './computer-action.viewer';
import { computerQueryLive } from './computer-query.live';
import { computerQueryStatus } from './computer-query.status';
import { computerTask } from './computer.task';
import type * as ComputerTypes from '../../types/computer.types';
import type { Context } from '@earendil-works/chord/context';

export function makeComputerService(deps: ComputerTypes.ComputerServiceDeps) {
  const actionDeps: ComputerTypes.ComputerActionDeps = { ...deps, task: computerTask(deps.host) };

  return {
    actions: {
      start: (context: Context) => computerActionStart(actionDeps, { context }),
      sleep: (context: Context) => computerActionSleep(deps, { context }),
      shutdown: (context: Context) => computerActionShutdown(deps, { context }),
      thumbnail: () => computerActionThumbnail(deps),
      touch: (context: Context) => computerActionTouch(actionDeps, { context }),
      takeControl: (params: ComputerTypes.ComputerTakeControlParams, context: Context) => computerActionTakeControl(deps, { ...params, context }),
      handoff: (params: ComputerTypes.ComputerHandoffParams, context: Context) => computerActionHandoff(deps, { ...params, context }),
      releaseControl: (params: ComputerTypes.ComputerReleaseControlParams, context: Context) => (
        computerActionReleaseControl(actionDeps, { ...params, context })
      ),
      viewer: (params: ComputerTypes.ComputerViewerParams, context: Context) => computerActionViewer(actionDeps, { ...params, context }),
    },
    queries: {
      live: (context: Context) => computerQueryLive(deps, { context }),
      status: (context: Context) => computerQueryStatus(deps, { context }),
      endpoint: () => deps.host.queries.endpoint({ botId: deps.botId }),
    },
  };
}

export type ComputerService = ReturnType<typeof makeComputerService>;
