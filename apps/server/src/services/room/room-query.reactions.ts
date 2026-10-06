import type * as RoomTypes from '#/types/room.types';

export function roomQueryReactions(deps: RoomTypes.RoomServiceDeps, params: RoomTypes.RoomQueryReactionsParams): RoomTypes.RoomReactions {
  const { db } = deps.database;

  let query = db
    .selectFrom('reaction')
    .innerJoin('message as target', 'target.id', 'reaction.targetId')
    .select(['reaction.id', 'reaction.authorId', 'reaction.authorName', 'reaction.emoji', 'reaction.targetId'])
    .where('reaction.roomId', '=', params.roomId)
    .where('reaction.removedAt', 'is', null)
    .where('target.seq', '>=', params.fromSeq)
    .orderBy('reaction.createdAt')
    .orderBy('reaction.id');

  if (params.throughSeq !== undefined) {
    query = query.where('target.seq', '<=', params.throughSeq);
  }

  const targets = new Map<string, Map<string, RoomTypes.RoomReactionGroup>>();

  for (const row of deps.database.all(query)) {
    const groups = targets.get(row.targetId) ?? new Map<string, RoomTypes.RoomReactionGroup>();
    const group = groups.get(row.emoji) ?? { emoji: row.emoji, count: 0, names: [], mine: null };

    group.count += 1;
    group.names.push(row.authorName);
    group.mine = row.authorId === params.userId ? row.id : group.mine;
    groups.set(row.emoji, group);
    targets.set(row.targetId, groups);
  }

  return Object.fromEntries([...targets].map(([targetId, groups]) => [targetId, [...groups.values()]]));
}
