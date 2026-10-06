import { roomInputCreate, roomInputDelete, roomInputUpdate } from '#/types/room-input.types';
import { roomAddReactionInput, roomArrangeInput, roomHistoryInput, roomOpenDirectInput, roomOpenTeamInput, roomReactionsInput, roomRemoveFileInput, roomRemoveReactionInput, roomRerunInput, roomResetInput, roomSendInput, roomTimelineInput, roomUploadInput } from '#/types/room.types';
import { runApproveInput, runCancelInput, runRetryInput, runStopInput } from '#/types/run.types';
import { baseRouter } from './rpc.middlewares';
import { authedProcedure } from './rpc.procedures';

const rooms = baseRouter.router({
  list: authedProcedure
    .handler(async ({ context }) => context.services.tenant.queries.rooms({ organizationId: context.auth.organization.id })),
  create: authedProcedure
    .input(roomInputCreate)
    .handler(async ({ context, input }) => context.services.tenant.actions.createRoom({
      organizationId: context.auth.organization.id,
      name: input.name,
      botIds: input.botIds,
      description: input.description,
      driver: input.driver,
      sendMode: input.sendMode,
    })),
  openTeam: authedProcedure
    .input(roomOpenTeamInput)
    .handler(async ({ context, input }) => context.services.tenant.actions.openTeam({
      organizationId: context.auth.organization.id,
      name: input.name,
      botIds: input.botIds,
    })),
  openDirect: authedProcedure
    .input(roomOpenDirectInput)
    .handler(async ({ context, input }) => context.services.tenant.actions.openDirect({
      organizationId: context.auth.organization.id,
      botId: input.botId,
    })),
  arrange: authedProcedure
    .input(roomArrangeInput)
    .handler(async ({ context, input }) => context.services.tenant.actions.arrangeRooms({
      organizationId: context.auth.organization.id,
      pinned: input.pinned,
      placed: input.placed,
    })),
  update: authedProcedure
    .input(roomInputUpdate)
    .handler(async ({ context, input }) => context.services.tenant.actions.updateRoom({
      organizationId: context.auth.organization.id,
      roomId: input.roomId,
      name: input.name,
      botIds: input.botIds,
      description: input.description,
      driver: input.driver,
      sendMode: input.sendMode,
    })),
  drafts: authedProcedure
    .input(roomTimelineInput)
    .handler(async ({ context, input }) => context.services.tenant.queries.drafts({
      organizationId: context.auth.organization.id,
      roomId: input.roomId,
    })),
  timeline: authedProcedure
    .input(roomTimelineInput)
    .handler(async ({ context, input }) => context.services.tenant.queries.timeline({
      organizationId: context.auth.organization.id,
      roomId: input.roomId,
    })),
  history: authedProcedure
    .input(roomHistoryInput)
    .handler(async ({ context, input }) => context.services.tenant.queries.history({
      organizationId: context.auth.organization.id,
      roomId: input.roomId,
      before: input.before,
    })),
  reactions: authedProcedure
    .input(roomReactionsInput)
    .handler(async ({ context, input }) => context.services.tenant.queries.reactions({
      organizationId: context.auth.organization.id,
      userId: context.auth.user.id,
      roomId: input.roomId,
      fromSeq: input.fromSeq,
    })),
  delete: authedProcedure
    .input(roomInputDelete)
    .handler(async ({ context, input }) => context.services.tenant.actions.deleteRoom({
      organizationId: context.auth.organization.id,
      roomId: input.roomId,
    })),
  reset: authedProcedure
    .input(roomResetInput)
    .handler(async ({ context, input }) => context.services.tenant.actions.reset({
      organizationId: context.auth.organization.id,
      roomId: input.roomId,
      botIds: input.botIds,
    })),
  send: authedProcedure
    .input(roomSendInput)
    .handler(async ({ context, input }) => context.services.tenant.actions.send({
      organizationId: context.auth.organization.id,
      userId: context.auth.user.id,
      userName: context.auth.user.name,
      roomId: input.roomId,
      messageId: input.messageId,
      text: input.text,
      fileIds: input.fileIds,
      replyToMessageId: input.replyToMessageId,
    })),
  removeFile: authedProcedure
    .input(roomRemoveFileInput)
    .handler(async ({ context, input }) => context.services.tenant.actions.removeFile({
      organizationId: context.auth.organization.id,
      roomId: input.roomId,
      fileId: input.fileId,
    })),
  upload: authedProcedure
    .input(roomUploadInput)
    .handler(async ({ context, input }) => context.services.tenant.actions.uploadFile({
      organizationId: context.auth.organization.id,
      roomId: input.roomId,
      file: input.file,
    })),
  rerun: authedProcedure
    .input(roomRerunInput)
    .handler(async ({ context, input }) => context.services.tenant.actions.rerun({
      organizationId: context.auth.organization.id,
      userId: context.auth.user.id,
      userName: context.auth.user.name,
      roomId: input.roomId,
    })),
  addReaction: authedProcedure
    .input(roomAddReactionInput)
    .handler(async ({ context, input }) => context.services.tenant.actions.addReaction({
      organizationId: context.auth.organization.id,
      userId: context.auth.user.id,
      userName: context.auth.user.name,
      roomId: input.roomId,
      messageId: input.messageId,
      reactionId: input.reactionId,
      emoji: input.emoji,
    })),
  removeReaction: authedProcedure
    .input(roomRemoveReactionInput)
    .handler(async ({ context, input }) => context.services.tenant.actions.removeReaction({
      organizationId: context.auth.organization.id,
      userId: context.auth.user.id,
      roomId: input.roomId,
      reactionId: input.reactionId,
    })),
  stop: authedProcedure
    .input(runStopInput)
    .handler(async ({ context, input }) => context.services.tenant.actions.stop({
      organizationId: context.auth.organization.id,
      roomId: input.roomId,
    })),
  retry: authedProcedure
    .input(runRetryInput)
    .handler(async ({ context, input }) => context.services.tenant.actions.retry({
      organizationId: context.auth.organization.id,
      roomId: input.roomId,
      runId: input.runId,
    })),
  cancel: authedProcedure
    .input(runCancelInput)
    .handler(async ({ context, input }) => context.services.tenant.actions.cancel({
      organizationId: context.auth.organization.id,
      roomId: input.roomId,
      runId: input.runId,
    })),
  approve: authedProcedure
    .input(runApproveInput)
    .handler(async ({ context, input }) => context.services.tenant.actions.approve({
      organizationId: context.auth.organization.id,
      userName: context.auth.user.name,
      approvalId: input.approvalId,
      approved: input.approved,
    })),
});

export default rooms;
