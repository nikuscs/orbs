import { Errors } from '@orbs/errors/universal';
import { memoryQueryGet } from './memory-query.get';
import { memoryAssertEditable } from './memory.utils';
import type { MemoryActionForgetParams, MemoryReceipt, MemoryServiceDeps } from '#/types/memory.types';

export async function memoryActionForget(deps: MemoryServiceDeps, params: MemoryActionForgetParams): Promise<MemoryReceipt> {
  const { db } = deps.database;

  const receipt = await db
    .selectFrom('memoryOperation')
    .select(['memoryId', 'revision'])
    .where('organizationId', '=', params.organizationId)
    .where('id', '=', params.operationId)
    .executeTakeFirst();

  if (receipt) {
    if (receipt.memoryId !== params.id) {
      throw new Errors.CONFLICT();
    }

    return receipt;
  }

  const row = memoryAssertEditable(await memoryQueryGet(deps, params), params.scope, params.expectedRevision);
  const result = { memoryId: row.id, revision: row.revision + 1 };

  await deps.database.batch([
    db.insertInto('memoryOperation').values({
      organizationId: params.organizationId,
      id: params.operationId,
      expectedRevision: row.revision,
      ...result,
    }),
    db
      .updateTable('memory')
      .set({
        text: null,
        revision: result.revision,
        updatedAt: new Date().toISOString(),
      })
      .where('organizationId', '=', params.organizationId)
      .where('id', '=', row.id)
      .where('revision', '=', row.revision),
  ]);

  return result;
}
