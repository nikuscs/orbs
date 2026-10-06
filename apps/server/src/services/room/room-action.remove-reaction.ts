import { roomQueryReactions } from './room-query.reactions';
import type { RoomActionRemoveReactionParams, RoomRemoveReactionResult, RoomServiceDeps } from '#/types/room.types';

export function roomActionRemoveReaction(deps: RoomServiceDeps, params: RoomActionRemoveReactionParams): RoomRemoveReactionResult {
  const { db } = deps.database;

  const reaction = deps.database.all(db
    .selectFrom('reaction')
    .innerJoin('message as target', 'target.id', 'reaction.targetId')
    .select(['reaction.authorId', 'reaction.removedAt', 'target.id as targetId', 'target.seq as targetSeq'])
    .where('reaction.id', '=', params.reactionId)
    .where('reaction.roomId', '=', params.roomId)).at(0);

  if (!reaction) {
    return null;
  }

  if (reaction.authorId !== params.userId) {
    return 'forbidden';
  }

  if (reaction.removedAt === null) {
    deps.database.run(db
      .updateTable('reaction')
      .set({ removedAt: new Date().toISOString() })
      .where('id', '=', params.reactionId));
    deps.sockets.broadcast({
      type: 'reaction.updated',
      roomId: params.roomId,
      messageId: reaction.targetId,
    });
  }

  return {
    messageId: reaction.targetId,
    reactionId: params.reactionId,
    active: false,
    groups: roomQueryReactions(deps, {
      roomId: params.roomId,
      userId: params.userId,
      fromSeq: reaction.targetSeq,
      throughSeq: reaction.targetSeq,
    })[reaction.targetId] ?? [],
  };
}
