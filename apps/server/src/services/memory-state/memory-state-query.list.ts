import { sql } from 'kysely';
import { roomMessageText } from '#services/room/room.utils';
import { memoryStateQueryOwner } from './memory-state-query.owner';
import type { MemoryStateQueryListParams, MemoryStateServiceDeps } from '#/types/memory-state.types';

export async function memoryStateQueryList(deps: MemoryStateServiceDeps, params: MemoryStateQueryListParams) {
  await memoryStateQueryOwner(deps, params);

  const list = await deps.memory.queries.list({ ...params, organizationId: deps.organizationId });

  const pending =
    deps.database
      .all(
        deps.database.db
          .selectFrom('memorySnapshot')
          .select('dirty')
          .where('scope', '=', params.scope.scope)
          .where('ownerId', '=', params.scope.ownerId),
      )
      .at(0)?.dirty === 1;

  const roomIds = [...new Set(list.items.filter((fact) => fact.subjectKind === 'room').map((fact) => fact.subjectId))];
  const messageIds = params.includeSourceText ? [...new Set(list.items.flatMap((fact) => fact.sources.slice(-3).map((source) => source.messageId)))] : [];

  const rooms = new Map(
    (roomIds.length ? deps.database.all(
      deps.database.db.selectFrom('room').select(['id', 'name']).where('id', 'in', roomIds),
    ) : []).map((room) => [room.id, room.name]),
  );

  const messages = new Map(
    (messageIds.length ? deps.database.all(
      deps.database.db.selectFrom('message').select(['id', 'roomId', 'authorName', 'parts'])
        .where(sql<boolean>`id in (select value from json_each(${JSON.stringify(messageIds)}))`),
    ) : []).map((message) => [message.id, message]),
  );

  const items = list.items.map((fact) => {
    const sources = fact.sources.slice(-3).map((source) => {
      const found = messages.get(source.messageId);
      const message = found?.roomId === source.roomId ? found : undefined;

      return { ...source, authorName: message?.authorName, text: message ? roomMessageText(message.parts).slice(0, 500) : null };
    });

    return { ...fact, subjectName: fact.userName ?? fact.botName ?? (fact.subjectKind === 'room' ? rooms.get(fact.subjectId) : null) ?? null, sources };
  });

  return { ...list, items, pending };
}
