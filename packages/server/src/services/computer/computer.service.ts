import { computerActionRelease } from './computer-action.release';
import { computerActionShutdown } from './computer-action.shutdown';
import { computerActionSleep } from './computer-action.sleep';
import { computerActionStart } from './computer-action.start';
import { computerActionThumbnail } from './computer-action.thumbnail';
import { computerActionTouch } from './computer-action.touch';
import { computerActionViewer } from './computer-action.viewer';
import { computerQueryEndpoint } from './computer-query.endpoint';
import { computerQueryStatus } from './computer-query.status';
import type { ComputerReleaseParams, ComputerServiceDeps, ComputerViewerParams } from '../../types/computer.types';
import type * as UniversalTypes from '@repo/contracts/universal';

export function makeComputerService(deps: ComputerServiceDeps) {
  return {
    actions: {
      start: (params: UniversalTypes.BotGetInput) => computerActionStart(deps, params),
      sleep: (params: UniversalTypes.BotGetInput) => computerActionSleep(deps, params),
      shutdown: (params: UniversalTypes.BotGetInput) => computerActionShutdown(deps, params),
      thumbnail: (params: UniversalTypes.BotGetInput) => computerActionThumbnail(deps, params),
      touch: (params: UniversalTypes.BotGetInput) => computerActionTouch(deps, params),
      release: (params: ComputerReleaseParams) => computerActionRelease(deps, params),
      viewer: (params: ComputerViewerParams) => computerActionViewer(deps, params),
    },
    queries: {
      status: (params: UniversalTypes.BotGetInput) => computerQueryStatus(deps, params),
      endpoint: (params: UniversalTypes.BotGetInput) => computerQueryEndpoint(deps, params),
    },
  };
}

export type ComputerService = ReturnType<typeof makeComputerService>;
