import { roomQueryReactions } from './room-query.reactions';
import { ROOM } from './room.constants';
import type { RoomActionAddReactionParams, RoomAddReactionResult, RoomServiceDeps } from '#/types/room.types';

export function roomActionAddReaction(deps: RoomServiceDeps, params: RoomActionAddReactionParams): RoomAddReactionResult {
  const { db } = deps.database;

  const target = deps.database.all(db
    .selectFrom('message')
    .leftJoin('member', (join) => join.onRef('member.roomId', '=', 'message.roomId').onRef('member.botId', '=', 'message.authorId'))
    .select(['message.id', 'message.seq', 'member.botId as authorBotId'])
    .where('message.id', '=', params.messageId)
    .where('message.roomId', '=', params.roomId)
    .where('message.role', '=', 'assistant')).at(0);

  const used = deps.database.all(db
    .selectFrom('reaction')
    .select(['roomId', 'authorId', 'targetId', 'emoji', 'removedAt'])
    .where('id', '=', params.reactionId)).at(0);

  const active = deps.database.all(db
    .selectFrom('reaction')
    .select('id')
    .where('targetId', '=', params.messageId)
    .where('authorId', '=', params.userId)
    .where('emoji', '=', params.emoji)
    .where('removedAt', 'is', null)).at(0);

  const replay = used?.roomId === params.roomId
    && used.authorId === params.userId
    && used.targetId === params.messageId
    && used.emoji === params.emoji;

  if (used ? !replay : active) {
    return 'conflict';
  }

  if (!target || (!used && target.authorBotId === null)) {
    return null;
  }

  if (!used) {
    deps.database.run(db.insertInto('reaction').values({
      id: params.reactionId,
      roomId: params.roomId,
      targetId: target.id,
      authorId: params.userId,
      authorName: params.userName,
      emoji: params.emoji,
      deliverAt: Date.now() + ROOM.reactionUndoMs,
      removedAt: null,
      createdAt: new Date().toISOString(),
    }));
    deps.run.actions.arm();
    deps.sockets.broadcast({
      type: 'reaction.updated',
      roomId: params.roomId,
      messageId: target.id,
    });
  }

  return {
    messageId: target.id,
    reactionId: params.reactionId,
    active: !used || used.removedAt === null,
    groups: roomQueryReactions(deps, {
      roomId: params.roomId,
      userId: params.userId,
      fromSeq: target.seq,
      throughSeq: target.seq,
    })[target.id] ?? [],
  };
}
