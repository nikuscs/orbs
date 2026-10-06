import type { MemoryServiceDeps } from '#/types/memory.types';
import type { TenantActionDeleteRoomParams } from '#/types/tenant.types';

export async function memoryActionRemoveRoom(deps: MemoryServiceDeps, params: TenantActionDeleteRoomParams): Promise<void> {
  await deps.database.db
    .deleteFrom('memory')
    .where('organizationId', '=', params.organizationId)
    .where('scope', '=', 'room')
    .where('ownerId', '=', params.roomId)
    .execute();
}
