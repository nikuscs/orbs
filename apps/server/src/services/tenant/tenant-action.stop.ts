import type { TenantActionStopParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionStop(deps: TenantServiceDeps, params: TenantActionStopParams): Promise<void> {
  await deps.namespace.getByName(params.organizationId).runStop({ roomId: params.roomId });
}
