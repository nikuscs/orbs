import type { TenantActionMemoryMutateParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionMemoryMutate(deps: TenantServiceDeps, params: TenantActionMemoryMutateParams) {
  return deps.namespace.getByName(params.organizationId).memoryMutate(params);
}
