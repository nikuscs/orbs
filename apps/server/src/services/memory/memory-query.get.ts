import type { MemoryQueryGetParams, MemoryServiceDeps } from '#/types/memory.types';

export async function memoryQueryGet(deps: MemoryServiceDeps, params: MemoryQueryGetParams) {
  return deps.database.db
    .selectFrom('memory')
    .selectAll()
    .where('organizationId', '=', params.organizationId)
    .where('id', '=', params.id)
    .executeTakeFirst();
}
