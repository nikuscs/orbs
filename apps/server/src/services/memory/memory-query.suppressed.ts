import type { MemoryQuerySuppressedParams, MemoryServiceDeps } from '#/types/memory.types';

export async function memoryQuerySuppressed(deps: MemoryServiceDeps, params: MemoryQuerySuppressedParams): Promise<string[]> {
  if (!params.sourceIds.length) {
    return [];
  }

  const rows = await deps.database.db
    .selectFrom('memorySource')
    .innerJoin('memory', 'memory.id', 'memorySource.memoryId')
    .select('memorySource.messageId')
    .where('memorySource.organizationId', '=', params.organizationId)
    .where('memorySource.messageId', 'in', params.sourceIds)
    .where('memory.text', 'is', null)
    .where('memory.mergedInto', 'is', null)
    .execute();

  return [...new Set(rows.map((row) => row.messageId))];
}
