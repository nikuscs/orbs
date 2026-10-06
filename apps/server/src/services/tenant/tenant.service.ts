import { tenantActionAddReaction } from './tenant-action.add-reaction';
import { tenantActionApprove } from './tenant-action.approve';
import { tenantActionArrangeRooms } from './tenant-action.arrange-rooms';
import { tenantActionCancel } from './tenant-action.cancel';
import { tenantActionCreateRoom } from './tenant-action.create-room';
import { tenantActionDeleteBot } from './tenant-action.delete-bot';
import { tenantActionDeleteRoom } from './tenant-action.delete-room';
import { tenantActionDisconnect } from './tenant-action.disconnect';
import { tenantActionMemoryControl } from './tenant-action.memory-control';
import { tenantActionMemoryMutate } from './tenant-action.memory-mutate';
import { tenantActionMemoryWipe } from './tenant-action.memory-wipe';
import { tenantActionOpenDirect } from './tenant-action.open-direct';
import { tenantActionOpenTeam } from './tenant-action.open-team';
import { tenantActionRemoveFile } from './tenant-action.remove-file';
import { tenantActionRemoveReaction } from './tenant-action.remove-reaction';
import { tenantActionRerun } from './tenant-action.rerun';
import { tenantActionReset } from './tenant-action.reset';
import { tenantActionRetry } from './tenant-action.retry';
import { tenantActionSend } from './tenant-action.send';
import { tenantActionSocketAuthorize } from './tenant-action.socket-authorize';
import { tenantActionStop } from './tenant-action.stop';
import { tenantActionUpdateRoom } from './tenant-action.update-room';
import { tenantActionUploadFile } from './tenant-action.upload-file';
import { tenantQueryDrafts } from './tenant-query.drafts';
import { tenantQueryFile } from './tenant-query.file';
import { tenantQueryHarnesses } from './tenant-query.harnesses';
import { tenantQueryHistory } from './tenant-query.history';
import { tenantQueryMemoryExport } from './tenant-query.memory-export';
import { tenantQueryMemoryList } from './tenant-query.memory-list';
import { tenantQueryMemoryStatus } from './tenant-query.memory-status';
import { tenantQueryModels } from './tenant-query.models';
import { tenantQueryReactions } from './tenant-query.reactions';
import { tenantQueryRooms } from './tenant-query.rooms';
import { tenantQuerySkills } from './tenant-query.skills';
import { tenantQueryTimeline } from './tenant-query.timeline';
import type * as TenantTypes from '#/types/tenant.types';

export function makeTenantService(deps: TenantTypes.TenantServiceDeps) {
  return {
    queries: {
      memoryStatus: (params: TenantTypes.TenantQueryMemoryStatusParams) => tenantQueryMemoryStatus(deps, params),
      memoryExport: (params: TenantTypes.TenantQueryMemoryExportParams) => tenantQueryMemoryExport(deps, params),
      memoryList: (params: TenantTypes.TenantQueryMemoryListParams) => tenantQueryMemoryList(deps, params),
      drafts: (params: TenantTypes.TenantQueryDraftsParams) => tenantQueryDrafts(deps, params),
      file: (params: TenantTypes.TenantQueryFileParams) => tenantQueryFile(deps, params),
      harnesses: (params: TenantTypes.TenantQueryHarnessesParams) => tenantQueryHarnesses(deps, params),
      history: (params: TenantTypes.TenantQueryHistoryParams) => tenantQueryHistory(deps, params),
      models: (params: TenantTypes.TenantQueryModelsParams) => tenantQueryModels(deps, params),
      reactions: (params: TenantTypes.TenantQueryReactionsParams) => tenantQueryReactions(deps, params),
      rooms: (params: TenantTypes.TenantQueryRoomsParams) => tenantQueryRooms(deps, params),
      skills: (params: TenantTypes.TenantQuerySkillsParams) => tenantQuerySkills(deps, params),
      timeline: (params: TenantTypes.TenantQueryTimelineParams) => tenantQueryTimeline(deps, params),
    },
    actions: {
      memoryWipe: (params: TenantTypes.TenantActionMemoryWipeParams) => tenantActionMemoryWipe(deps, params),
      memoryControl: (params: TenantTypes.TenantActionMemoryControlParams) => tenantActionMemoryControl(deps, params),
      memoryMutate: (params: TenantTypes.TenantActionMemoryMutateParams) => tenantActionMemoryMutate(deps, params),
      socketAuthorize: (params: TenantTypes.TenantActionSocketAuthorizeParams) => tenantActionSocketAuthorize(deps, params),
      disconnect: (params: TenantTypes.TenantActionDisconnectParams) => tenantActionDisconnect(deps, params),
      createRoom: (params: TenantTypes.TenantActionCreateRoomParams) => tenantActionCreateRoom(deps, params),
      openDirect: (params: TenantTypes.TenantActionOpenDirectParams) => tenantActionOpenDirect(deps, params),
      openTeam: (params: TenantTypes.TenantActionOpenTeamParams) => tenantActionOpenTeam(deps, params),
      updateRoom: (params: TenantTypes.TenantActionUpdateRoomParams) => tenantActionUpdateRoom(deps, params),
      arrangeRooms: (params: TenantTypes.TenantActionArrangeRoomsParams) => tenantActionArrangeRooms(deps, params),
      send: (params: TenantTypes.TenantActionSendParams) => tenantActionSend(deps, params),
      uploadFile: (params: TenantTypes.TenantActionUploadFileParams) => tenantActionUploadFile(deps, params),
      removeFile: (params: TenantTypes.TenantActionRemoveFileParams) => tenantActionRemoveFile(deps, params),
      stop: (params: TenantTypes.TenantActionStopParams) => tenantActionStop(deps, params),
      rerun: (params: TenantTypes.TenantActionRerunParams) => tenantActionRerun(deps, params),
      addReaction: (params: TenantTypes.TenantActionAddReactionParams) => tenantActionAddReaction(deps, params),
      removeReaction: (params: TenantTypes.TenantActionRemoveReactionParams) => tenantActionRemoveReaction(deps, params),
      retry: (params: TenantTypes.TenantActionRetryParams) => tenantActionRetry(deps, params),
      reset: (params: TenantTypes.TenantActionResetParams) => tenantActionReset(deps, params),
      deleteRoom: (params: TenantTypes.TenantActionDeleteRoomParams) => tenantActionDeleteRoom(deps, params),
      deleteBot: (params: TenantTypes.TenantActionDeleteBotParams) => tenantActionDeleteBot(deps, params),
      cancel: (params: TenantTypes.TenantActionCancelParams) => tenantActionCancel(deps, params),
      approve: (params: TenantTypes.TenantActionApproveParams) => tenantActionApprove(deps, params),
    },
  };
}

export type TenantService = ReturnType<typeof makeTenantService>;
