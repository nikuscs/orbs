import type { TenantActionMemoryWipeParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionMemoryWipe(deps: TenantServiceDeps, params: TenantActionMemoryWipeParams) {
  return deps.namespace.getByName(params.organizationId).memoryWipe(params);
}
