import type { TenantQueryMemoryListParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantQueryMemoryList(deps: TenantServiceDeps, params: TenantQueryMemoryListParams) {
  return deps.namespace.getByName(params.organizationId).memoryList({ ...params, includeSourceText: true });
}
