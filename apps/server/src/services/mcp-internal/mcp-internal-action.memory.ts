import { match } from 'ts-pattern';
import { roomMessageText } from '#services/room/room.utils';
import type { McpInternalActionMemoryParams, McpInternalServiceDeps } from '#/types/mcp-internal-service.types';
import type { MemoryScope } from '#/types/memory.types';

export async function mcpInternalActionMemory(deps: McpInternalServiceDeps, params: McpInternalActionMemoryParams) {
  const { roomId, botId } = params.caller.run;
  const scope: MemoryScope = { scope: 'room', ownerId: roomId };

  const scopes = {
    global: { scope: 'global', ownerId: '' },
    bot: { scope: 'bot', ownerId: botId },
    room: scope,
  } satisfies Record<'global' | 'bot' | 'room', MemoryScope>;

  return match(params.call)
    .with({ name: 'memory_list' }, { name: 'memory_search' }, ({ input }) =>
      deps.memoryState.queries.list({
        ...input,
        scope: scopes[input.scope],
      }),
    )
    .with({ name: 'memory_save' }, ({ input }) =>
      deps.memoryState.actions.mutate({
        actorId: botId,
        roomId,
        mutation: { action: 'save', input: { ...input, scope, operationId: `${params.caller.run.id}:${params.call.name}:${input.operationId}` } },
      }),
    )
    .with({ name: 'memory_update' }, ({ input }) =>
      deps.memoryState.actions.mutate({
        actorId: botId,
        roomId,
        mutation: { action: 'update', input: { ...input, scope, operationId: `${params.caller.run.id}:${params.call.name}:${input.operationId}` } },
      }),
    )
    .with({ name: 'memory_forget' }, ({ input }) =>
      deps.memoryState.actions.mutate({
        actorId: botId,
        roomId,
        mutation: { action: 'forget', input: { ...input, scope, operationId: `${params.caller.run.id}:${params.call.name}:${input.operationId}` } },
      }),
    )
    .with({ name: 'room_history' }, ({ input }) => {
      const fresh = input.includeBeforeFresh
        ? 0
        : (deps.database
          .all(deps.database.db.selectFrom('member').select('freshFrom').where('roomId', '=', roomId).where('botId', '=', botId))
          .at(0)?.freshFrom ?? 0);

      let query = deps.database.db
        .selectFrom('message')
        .select(['id', 'seq', 'role', 'authorId', 'authorName', 'parts', 'createdAt'])
        .where('roomId', '=', roomId)
        .where('seq', '>', fresh)
        .where('reactionId', 'is', null);

      if (input.beforeSeq) {
        query = query.where('seq', '<', input.beforeSeq);
      }

      const rows = deps.database.all(query.orderBy('seq', 'desc').limit(input.limit));

      const messages = rows
        .map(({ parts, ...row }) => ({ ...row, text: roomMessageText(parts) }))
        .filter((row) => row.text.toLowerCase().includes(input.query.toLowerCase()))
        .reverse();

      return { messages, beforeSeq: rows.length === input.limit ? rows.at(-1)?.seq : undefined };
    })
    .exhaustive();
}
