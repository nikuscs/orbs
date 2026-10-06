import { memorySources } from '#/types/memory.types';
import type { MemoryQueryCandidatesParams, MemoryServiceDeps } from '#/types/memory.types';

export async function memoryQueryCandidates(deps: MemoryServiceDeps, params: MemoryQueryCandidatesParams) {
  const rows = await deps.database.db
    .selectFrom('memory')
    .selectAll()
    .where('organizationId', '=', params.organizationId)
    .where('scope', '=', 'room')
    .where('ownerId', '=', params.roomId)
    .where('text', 'is not', null)
    .where('subjectId', 'in', [...new Set([params.roomId, ...params.subjectIds])])
    .orderBy('updatedAt', 'desc')
    .orderBy('id')
    .limit(100)
    .execute();

  return rows.map((row) => ({ ...row, sources: memorySources.parse(JSON.parse(row.sources)) }));
}
