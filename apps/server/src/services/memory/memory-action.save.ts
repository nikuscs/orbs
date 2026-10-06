import { Errors } from '@orbs/errors/universal';
import { memoryQuerySubject } from './memory-query.subject';
import { memoryMergeSources, memorySafeText } from './memory.utils';
import type { MemoryActionSaveParams, MemoryReceipt, MemoryServiceDeps } from '#/types/memory.types';

export async function memoryActionSave(deps: MemoryServiceDeps, params: MemoryActionSaveParams): Promise<MemoryReceipt> {
  const { db } = deps.database;

  const receipt = await db
    .selectFrom('memoryOperation')
    .select(['memoryId', 'revision'])
    .where('organizationId', '=', params.organizationId)
    .where('id', '=', params.operationId)
    .executeTakeFirst();

  if (receipt) {
    return receipt;
  }

  await memoryQuerySubject(deps, params);
  const text = memorySafeText(params.text);

  const duplicate = await db
    .selectFrom('memory')
    .select(['id', 'revision', 'sources'])
    .where('organizationId', '=', params.organizationId)
    .where('scope', '=', params.scope.scope)
    .where('ownerId', '=', params.scope.ownerId)
    .where('subjectKind', '=', params.subject.kind)
    .where('subjectId', '=', params.subject.id)
    .where('text', '=', text)
    .executeTakeFirst();

  const now = new Date().toISOString();
  const result = { memoryId: duplicate?.id ?? crypto.randomUUID(), revision: duplicate?.revision ?? 1 };
  const writes = [];

  if (!duplicate) {
    if (params.origin === 'automatic' && params.sources.length === 0) {
      throw new Errors.FORBIDDEN();
    }

    writes.push(
      db.insertInto('memory').values({
        id: result.memoryId,
        mergedInto: null,
        botId: params.scope.scope === 'bot' ? params.scope.ownerId : null,
        organizationId: params.organizationId,
        scope: params.scope.scope,
        ownerId: params.scope.ownerId,
        subjectKind: params.subject.kind,
        subjectId: params.subject.id,
        text,
        revision: 1,
        origin: params.origin,
        sources: JSON.stringify(params.sources),
        createdBy: params.actorId,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  if (duplicate && params.sources.length) {
    writes.push(
      db
        .updateTable('memory')
        .set({ sources: memoryMergeSources(duplicate.sources, params.sources) })
        .where('id', '=', duplicate.id)
        .where('organizationId', '=', params.organizationId),
    );
  }

  for (const source of params.sources) {
    writes.push(
      db
        .insertInto('memorySource')
        .values({
          organizationId: params.organizationId,
          memoryId: result.memoryId,
          messageId: source.messageId,
        })
        .onConflict((conflict) => conflict.doNothing()),
    );
  }

  writes.push(
    db.insertInto('memoryOperation').values({
      organizationId: params.organizationId,
      id: params.operationId,
      expectedRevision: null,
      ...result,
    }),
  );
  await deps.database.batch(writes);

  return result;
}
