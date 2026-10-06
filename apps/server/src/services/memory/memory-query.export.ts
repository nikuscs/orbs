import { memorySources } from '#/types/memory.types';
import { MEMORY } from './memory.constants';
import type { MemoryQueryExportParams, MemoryServiceDeps } from '#/types/memory.types';

export async function memoryQueryExport(deps: MemoryServiceDeps, params: MemoryQueryExportParams) {
  const rows = await deps.database.db
    .selectFrom('memory')
    .selectAll()
    .where('organizationId', '=', params.organizationId)
    .where('id', '>', params.after ?? '')
    .orderBy('id')
    .limit(MEMORY.exportPage + 1)
    .execute();

  const page = rows.slice(0, MEMORY.exportPage);

  return {
    schemaVersion: 1,
    items: page.map((row) => ({ ...row, sources: memorySources.parse(JSON.parse(row.sources)) })),
    next: rows.length > MEMORY.exportPage ? page.at(-1)?.id : undefined,
  };
}
