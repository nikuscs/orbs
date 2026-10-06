import { sql } from 'kysely';
import { memoryQueryWipe } from './memory-query.wipe';
import type {
  MemoryActionWipeParams,
  MemoryServiceDeps,
} from '#/types/memory.types';

export async function memoryActionWipe(
  deps: MemoryServiceDeps,
  params: MemoryActionWipeParams,
) {
  const { receipt } = await memoryQueryWipe(deps, params);

  if (receipt) {
    return receipt;
  }

  const { db } = deps.database;

  const facts = db
    .selectFrom('memory')
    .where('organizationId', '=', params.organizationId)
    .where('scope', '=', params.scope.scope)
    .where('ownerId', '=', params.scope.ownerId)
    .where('text', 'is not', null);

  const count = await facts
    .select(({ fn }) => fn.count<number>('id').as('count'))
    .executeTakeFirstOrThrow();

  const result = {
    memoryId: `${params.scope.scope}:${params.scope.ownerId}`,
    revision: count.count,
  };

  await deps.database.batch([
    db.insertInto('memoryOperation').values({
      organizationId: params.organizationId,
      id: params.operationId,
      expectedRevision: null,
      ...result,
    }),
    db
      .updateTable('memory')
      .set({
        text: null,
        revision: sql`revision + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where('organizationId', '=', params.organizationId)
      .where('scope', '=', params.scope.scope)
      .where('ownerId', '=', params.scope.ownerId)
      .where('text', 'is not', null),
  ]);

  return result;
}
