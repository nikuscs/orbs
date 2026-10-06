import type { TenantQueryMemoryStatusParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantQueryMemoryStatus(deps: TenantServiceDeps, params: TenantQueryMemoryStatusParams) {
  return deps.namespace.getByName(params.organizationId).memoryStatus(params);
}
