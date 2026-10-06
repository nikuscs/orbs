import { STORAGE } from '#services/storage/storage.constants';
import { roomActionSweepFiles } from './room-action.sweep-files';
import { roomQueryGet } from './room-query.get';
import { roomFileParts, roomLastSeq, roomPreview, roomReplySnapshot } from './room.utils';
import type { DatabaseTenantMessage } from '#/types/database-tenant.types';
import type { RoomActionSendParams, RoomSendOutcome, RoomServiceDeps } from '#/types/room.types';
import type { FileUIPart } from 'ai';

export async function roomActionSend(deps: RoomServiceDeps, params: RoomActionSendParams): Promise<RoomSendOutcome> {
  function roomPendingFiles(serviceDeps: RoomServiceDeps, input: RoomActionSendParams): FileUIPart[] | null {
    if (input.rerunFiles) {
      return input.rerunFiles;
    }

    const files = input.fileIds.length === 0 ? [] : serviceDeps.database.all(serviceDeps.database.db
      .selectFrom('file')
      .select(['id', 'name', 'mediaType'])
      .where('roomId', '=', input.roomId)
      .where('messageId', 'is', null)
      .where('id', 'in', input.fileIds));

    return files.length === new Set(input.fileIds).size ? roomFileParts(files) : null;
  }

  roomActionSweepFiles(deps);

  const images = roomPendingFiles(deps, params)?.some((file) => STORAGE.imageTypes.some((type) => type === file.mediaType));
  const blind = images ? await deps.route.queries.blind({ roomId: params.roomId, text: params.text }) : [];

  const room = roomQueryGet(deps, params);

  if (!room) {
    return null;
  }

  const sent =
    params.messageId === undefined
      ? undefined
      : deps.database.all(deps.database.db.selectFrom('message').select('id').where('id', '=', params.messageId)).at(0);

  if (sent) {
    return { messageId: sent.id };
  }

  if (room.botIds.length === 0) {
    return 'empty';
  }

  const target =
    params.replyToMessageId === undefined
      ? undefined
      : deps.database
        .all(
          deps.database.db
            .selectFrom('message')
            .select(['id', 'authorName', 'parts'])
            .where('id', '=', params.replyToMessageId)
            .where('roomId', '=', params.roomId)
            .where('reactionId', 'is', null),
        )
        .at(0);

  if (params.replyToMessageId !== undefined && !target) {
    return null;
  }

  const files = roomPendingFiles(deps, params);

  if (!files) {
    return 'files';
  }

  if (blind.length > 0) {
    return blind;
  }

  const mode = params.rerunOf === undefined && files.length === 0 ? room.sendMode : 'queue';

  if (mode === 'interrupt') {
    deps.run.actions.stop({ roomId: params.roomId });
  }

  const message: DatabaseTenantMessage = {
    id: params.messageId ?? crypto.randomUUID(),
    roomId: params.roomId,
    seq: roomLastSeq(deps.database, params.roomId) + 1,
    role: 'user',
    authorId: params.userId,
    authorName: params.userName,
    runId: null,
    parts: JSON.stringify([...(params.text ? [{ type: 'text', text: params.text }] : []), ...files]),
    route: null,
    usage: null,
    replyTo: target ? JSON.stringify(roomReplySnapshot(target)) : null,
    rerunOf: params.rerunOf ?? null,
    triggerId: null,
    reactionId: null,
    createdAt: new Date().toISOString(),
  };

  deps.database.transaction(() => {
    deps.database.run(deps.database.db.insertInto('message').values(message));

    if (!params.rerunFiles && params.fileIds.length > 0) {
      deps.database.run(deps.database.db.updateTable('file').set({ messageId: message.id }).where('id', 'in', params.fileIds));
    }
  });
  deps.run.actions.supersede({ roomId: params.roomId, seq: message.seq });
  deps.run.actions.arm();
  deps.sockets.broadcast({
    type: 'message.created',
    roomId: params.roomId,
    message,
    preview: roomPreview(message),
  });

  if (mode === 'steer' && deps.run.actions.steer({ message })) {
    return { messageId: message.id };
  }

  await deps.run.actions.route({ messageId: message.id });

  return { messageId: message.id };
}
