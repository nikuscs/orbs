import type { TenantQueryRoomsParams, TenantRoomListItem, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantQueryRooms(deps: TenantServiceDeps, params: TenantQueryRoomsParams): Promise<TenantRoomListItem[]> {
  return deps.namespace.getByName(params.organizationId).roomList();
}
