import type { TenantActionMemoryControlParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionMemoryControl(deps: TenantServiceDeps, params: TenantActionMemoryControlParams) {
  return deps.namespace.getByName(params.organizationId).memoryControl(params);
}
