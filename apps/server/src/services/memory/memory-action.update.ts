import { Errors } from '@orbs/errors/universal';
import { memorySources } from '#/types/memory.types';
import { memoryQueryGet } from './memory-query.get';
import { memoryAssertEditable, memoryMergeSources, memorySafeText } from './memory.utils';
import type { MemoryActionUpdateParams, MemoryReceipt, MemoryServiceDeps } from '#/types/memory.types';

export async function memoryActionUpdate(deps: MemoryServiceDeps, params: MemoryActionUpdateParams): Promise<MemoryReceipt> {
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
  const merges = params.merge ?? [];

  if (new Set(merges.map((item) => item.id)).size !== merges.length || merges.some((item) => item.id === row.id)) {
    throw new Errors.CONFLICT();
  }

  const donors = await Promise.all(merges.map(async (item) => {
    const donor = memoryAssertEditable(await memoryQueryGet(deps, { organizationId: params.organizationId, id: item.id }), params.scope, item.expectedRevision);

    if (donor.subjectKind !== row.subjectKind || donor.subjectId !== row.subjectId) {
      throw new Errors.FORBIDDEN();
    }

    return donor;
  }));

  const sources = memoryMergeSources(row.sources, [...params.sources, ...donors.flatMap((donor) => memorySources.parse(JSON.parse(donor.sources)))]);

  await deps.database.batch([
    ...donors.map((donor) => db.insertInto('memoryOperation').values({
      organizationId: params.organizationId,
      id: `${params.operationId}/merge/${donor.id}`,
      memoryId: donor.id,
      revision: donor.revision + 1,
      expectedRevision: donor.revision,
    })),
    ...memorySources.parse(JSON.parse(sources)).map((source) =>
      db
        .insertInto('memorySource')
        .values({
          organizationId: params.organizationId,
          memoryId: row.id,
          messageId: source.messageId,
        })
        .onConflict((conflict) => conflict.doNothing()),
    ),
    db.insertInto('memoryOperation').values({
      organizationId: params.organizationId,
      id: params.operationId,
      expectedRevision: row.revision,
      ...result,
    }),
    db
      .updateTable('memory')
      .set({
        text: memorySafeText(params.text),
        sources,
        revision: result.revision,
        updatedAt: new Date().toISOString(),
      })
      .where('organizationId', '=', params.organizationId)
      .where('id', '=', row.id)
      .where('revision', '=', row.revision),
    ...donors.map((donor) => db.updateTable('memory').set({
      text: null,
      mergedInto: row.id,
      revision: donor.revision + 1,
      updatedAt: new Date().toISOString(),
    }).where('organizationId', '=', params.organizationId).where('id', '=', donor.id).where('revision', '=', donor.revision)),
  ]);

  return result;
}
