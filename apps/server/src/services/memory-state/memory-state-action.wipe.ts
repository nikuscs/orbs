import { sql } from 'kysely';
import { roomLastSeq } from '#services/room/room.utils';
import { memoryStateActionRefresh } from './memory-state-action.refresh';
import { memoryStateQueryOwner } from './memory-state-query.owner';
import type { MemoryStateServiceDeps } from '#/types/memory-state.types';
import type { MemoryWipeInput } from '#/types/memory.types';

export async function memoryStateActionWipe(
  deps: MemoryStateServiceDeps,
  params: MemoryWipeInput,
) {
  await memoryStateQueryOwner(deps, params);
  const input = { ...params, organizationId: deps.organizationId };
  const { receipt, roomIds } = await deps.memory.queries.wipe(input);
  const { scope } = params;

  if (!receipt) {
    deps.database.run(
      deps.database.db
        .insertInto('memorySnapshot')
        .values({
          ...scope,
          text: '',
          dirty: 1,
          dueAt: Date.now(),
        })
        .onConflict((conflict) =>
          conflict
            .columns(['scope', 'ownerId'])
            .doUpdateSet({ dirty: 1, dueAt: Date.now() }),
        ),
    );
    deps.alarm.set(Date.now());
    if (roomIds.length) {
      deps.database.run(
        deps.database.db
          .updateTable('memoryRoom')
          .set({
            recap: '',
            recapThrough: 0,
            recapRevision: sql`recapRevision + 1`,
          })
          .where('roomId', 'in', roomIds),
      );
    }

    if (scope.scope === 'room') {
      const cursor = roomLastSeq(deps.database, scope.ownerId);
      deps.database.run(
        deps.database.db
          .updateTable('memoryRoom')
          .set({
            generation: crypto.randomUUID(),
            status: 'idle',
            dueAt: null,
            requestId: null,
            source: null,
            result: null,
            attempt: 0,
            error: null,
            model: null,
            cursor,
            throughSeq: 0,
            fromSeq: 0,
            offset: 0,
            recap: '',
            recapFrom: cursor + 1,
            recapThrough: 0,
            recapRevision: sql`recapRevision + 1`,
          })
          .where('roomId', '=', scope.ownerId),
      );
    }
  }

  const result = receipt ?? (await deps.memory.actions.wipe(input));
  await memoryStateActionRefresh(deps, params);
  deps.sockets.broadcast({ type: 'memory.updated' });

  return { count: result.revision };
}
