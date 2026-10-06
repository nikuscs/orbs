import type { MemoryStateQueryExportParams, MemoryStateServiceDeps } from '#/types/memory-state.types';

export async function memoryStateQueryExport(deps: MemoryStateServiceDeps, params: MemoryStateQueryExportParams) {
  return deps.memory.queries.export({ ...params, organizationId: deps.organizationId });
}
