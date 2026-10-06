import type { DatabaseTenantRun } from '#/types/database-tenant.types';
import type { RunQueryGetParams, RunServiceDeps } from '#/types/run.types';

export function runQueryGet(deps: RunServiceDeps, params: RunQueryGetParams): DatabaseTenantRun | undefined {
  return deps.database.all(deps.database.db
    .selectFrom('run')
    .selectAll()
    .where('id', '=', params.runId)).at(0);
}
