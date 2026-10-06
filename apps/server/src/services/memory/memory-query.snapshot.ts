import { MEMORY } from './memory.constants';
import type { MemoryQueryListParams, MemoryServiceDeps } from '#/types/memory.types';

export async function memoryQuerySnapshot(deps: MemoryServiceDeps, params: Pick<MemoryQueryListParams, 'organizationId' | 'scope'>) {
  return deps.database.db
    .selectFrom('memory')
    .select(['id', 'subjectKind', 'subjectId', 'text', 'revision'])
    .where('organizationId', '=', params.organizationId)
    .where('scope', '=', params.scope.scope)
    .where('ownerId', '=', params.scope.ownerId)
    .where('text', 'is not', null)
    .orderBy('updatedAt', 'desc')
    .orderBy('id')
    .limit(MEMORY.factsPerScope)
    .execute();
}
