import { runActionAccept } from './run-action.accept';
import { runActionAnnounce } from './run-action.announce';
import { runActionApproval } from './run-action.approval';
import { runActionApprove } from './run-action.approve';
import { runActionArm } from './run-action.arm';
import { runActionCancel } from './run-action.cancel';
import { runActionChunk } from './run-action.chunk';
import { runActionDisconnect } from './run-action.disconnect';
import { runActionDispatch } from './run-action.dispatch';
import { runActionEnd } from './run-action.end';
import { runActionExpire } from './run-action.expire';
import { runActionRemoveBot } from './run-action.remove-bot';
import { runActionRetry } from './run-action.retry';
import { runActionRoute } from './run-action.route';
import { runActionSteer } from './run-action.steer';
import { runActionStop } from './run-action.stop';
import { runActionSupersede } from './run-action.supersede';
import { runQueryDrafts } from './run-query.drafts';
import { runQueryGet } from './run-query.get';
import { runQueryRetryable } from './run-query.retryable';
import { runQueryRoom } from './run-query.room';
import { runPromptsMemory, runPromptsMemoryExtraction } from './run.prompts';
import type * as RunTypes from '#/types/run.types';

export function makeRunService(deps: RunTypes.RunServiceDeps) {
  return {
    queries: {
      memoryPrompt: runPromptsMemory,
      extractionPrompt: runPromptsMemoryExtraction,
      drafts: (params: RunTypes.RunQueryDraftsParams) => runQueryDrafts(deps, params),
      get: (params: RunTypes.RunQueryGetParams) => runQueryGet(deps, params),
      retryable: (params: RunTypes.RunQueryRetryableParams) => runQueryRetryable(deps, params),
      room: (params: RunTypes.RunQueryRoomParams) => runQueryRoom(deps, params),
    },
    actions: {
      route: (params: RunTypes.RunActionRouteParams) => runActionRoute(deps, params),
      dispatch: () => runActionDispatch(deps),
      accept: (params: RunTypes.RunActionAcceptParams) => runActionAccept(deps, params),
      chunk: (params: RunTypes.RunActionChunkParams) => runActionChunk(deps, params),
      approval: (params: RunTypes.RunActionApprovalParams) => runActionApproval(deps, params),
      approve: (params: RunTypes.RunActionApproveParams) => runActionApprove(deps, params),
      end: (params: RunTypes.RunActionEndParams) => runActionEnd(deps, params),
      stop: (params: RunTypes.RunActionStopParams) => runActionStop(deps, params),
      steer: (params: RunTypes.RunActionSteerParams) => runActionSteer(deps, params),
      disconnect: () => runActionDisconnect(deps),
      expire: () => runActionExpire(deps),
      arm: () => runActionArm(deps),
      retry: (params: RunTypes.RunActionRetryParams) => runActionRetry(deps, params),
      removeBot: (params: RunTypes.RunActionRemoveBotParams) => runActionRemoveBot(deps, params),
      cancel: (params: RunTypes.RunActionCancelParams) => runActionCancel(deps, params),
      announce: (params: RunTypes.RunActionAnnounceParams) => runActionAnnounce(deps, params),
      supersede: (params: RunTypes.RunActionSupersedeParams) => runActionSupersede(deps, params),
    },
  };
}

export type RunService = ReturnType<typeof makeRunService>;
