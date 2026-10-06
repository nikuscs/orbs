import { roomLastSeq, roomReplySnapshot } from './room.utils';
import type { RoomServiceDeps } from '#/types/room.types';

export async function roomActionDeliverReactions(deps: RoomServiceDeps): Promise<void> {
  const { db } = deps.database;

  const due = deps.database.all(db
    .selectFrom('reaction')
    .innerJoin('message as target', 'target.id', 'reaction.targetId')
    .leftJoin('message as delivered', 'delivered.reactionId', 'reaction.id')
    .select(['reaction.id', 'reaction.roomId', 'reaction.authorId', 'reaction.authorName', 'reaction.emoji', 'target.id as targetId', 'target.authorName as targetAuthorName', 'target.parts as targetParts'])
    .where('reaction.removedAt', 'is', null)
    .where('reaction.deliverAt', '<=', Date.now())
    .where('delivered.id', 'is', null)
    .orderBy('reaction.deliverAt'));

  await Promise.all(due.map((reaction) => {
    const messageId = crypto.randomUUID();

    deps.database.run(db.insertInto('message').values({
      id: messageId,
      roomId: reaction.roomId,
      seq: roomLastSeq(deps.database, reaction.roomId) + 1,
      role: 'user',
      authorId: reaction.authorId,
      authorName: reaction.authorName,
      runId: null,
      parts: JSON.stringify([{ type: 'text', text: reaction.emoji }]),
      route: null,
      usage: null,
      replyTo: JSON.stringify(roomReplySnapshot({
        id: reaction.targetId,
        authorName: reaction.targetAuthorName,
        parts: reaction.targetParts,
      })),
      rerunOf: null,
      triggerId: null,
      reactionId: reaction.id,
      createdAt: new Date().toISOString(),
    }));

    return deps.run.actions.route({ messageId });
  }));
}
