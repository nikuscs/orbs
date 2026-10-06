import type { TenantActionArrangeRoomsParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionArrangeRooms(deps: TenantServiceDeps, params: TenantActionArrangeRoomsParams): Promise<void> {
  await deps.namespace.getByName(params.organizationId).roomArrange({ pinned: params.pinned, placed: params.placed });
}
