import type { TenantQueryMemoryExportParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantQueryMemoryExport(deps: TenantServiceDeps, params: TenantQueryMemoryExportParams) {
  return deps.namespace.getByName(params.organizationId).memoryExport(params);
}
