import { roomActionAddFile } from './room-action.add-file';
import { roomActionAddReaction } from './room-action.add-reaction';
import { roomActionArrange } from './room-action.arrange';
import { roomActionCreate } from './room-action.create';
import { roomActionDelete } from './room-action.delete';
import { roomActionDeleteBot } from './room-action.delete-bot';
import { roomActionDeliverReactions } from './room-action.deliver-reactions';
import { roomActionOpenDirect } from './room-action.open-direct';
import { roomActionOpenTeam } from './room-action.open-team';
import { roomActionRemoveFile } from './room-action.remove-file';
import { roomActionRemoveReaction } from './room-action.remove-reaction';
import { roomActionRerun } from './room-action.rerun';
import { roomActionReset } from './room-action.reset';
import { roomActionSend } from './room-action.send';
import { roomActionUpdate } from './room-action.update';
import { roomQueryFile } from './room-query.file';
import { roomQueryGet } from './room-query.get';
import { roomQueryHistory } from './room-query.history';
import { roomQueryList } from './room-query.list';
import { roomQueryReactions } from './room-query.reactions';
import { roomQueryTimeline } from './room-query.timeline';
import type * as RoomTypes from '#/types/room.types';

export function makeRoomService(deps: RoomTypes.RoomServiceDeps) {
  return {
    queries: {
      list: () => roomQueryList(deps),
      get: (params: RoomTypes.RoomQueryGetParams) => roomQueryGet(deps, params),
      timeline: (params: RoomTypes.RoomQueryTimelineParams) => roomQueryTimeline(deps, params),
      history: (params: RoomTypes.RoomQueryHistoryParams) => roomQueryHistory(deps, params),
      reactions: (params: RoomTypes.RoomQueryReactionsParams) => roomQueryReactions(deps, params),
      file: (params: RoomTypes.RoomQueryFileParams) => roomQueryFile(deps, params),
    },
    actions: {
      create: (params: RoomTypes.RoomActionCreateParams) => roomActionCreate(deps, params),
      openDirect: (params: RoomTypes.RoomActionOpenDirectParams) => roomActionOpenDirect(deps, params),
      openTeam: (params: RoomTypes.RoomActionOpenTeamParams) => roomActionOpenTeam(deps, params),
      update: (params: RoomTypes.RoomActionUpdateParams) => roomActionUpdate(deps, params),
      arrange: (params: RoomTypes.RoomActionArrangeParams) => roomActionArrange(deps, params),
      send: (params: RoomTypes.RoomActionSendParams) => roomActionSend(deps, params),
      addFile: (params: RoomTypes.RoomActionAddFileParams) => roomActionAddFile(deps, params),
      removeFile: (params: RoomTypes.RoomActionRemoveFileParams) => roomActionRemoveFile(deps, params),
      rerun: (params: RoomTypes.RoomActionRerunParams) => roomActionRerun(deps, params),
      addReaction: (params: RoomTypes.RoomActionAddReactionParams) => roomActionAddReaction(deps, params),
      removeReaction: (params: RoomTypes.RoomActionRemoveReactionParams) => roomActionRemoveReaction(deps, params),
      deliverReactions: () => roomActionDeliverReactions(deps),
      reset: (params: RoomTypes.RoomActionResetParams) => roomActionReset(deps, params),
      delete: (params: RoomTypes.RoomActionDeleteParams) => roomActionDelete(deps, params),
      deleteBot: (params: RoomTypes.RoomActionDeleteBotParams) => roomActionDeleteBot(deps, params),
    },
  };
}

export type RoomService = ReturnType<typeof makeRoomService>;
