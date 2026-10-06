import { Errors } from '@orbs/errors/universal';
import { sql } from 'kysely';
import type {
  MemoryActionWipeParams,
  MemoryServiceDeps,
} from '#/types/memory.types';

export async function memoryQueryWipe(
  deps: MemoryServiceDeps,
  params: MemoryActionWipeParams,
) {
  const receipt = await deps.database.db
    .selectFrom('memoryOperation')
    .select(['memoryId', 'revision'])
    .where('organizationId', '=', params.organizationId)
    .where('id', '=', params.operationId)
    .executeTakeFirst();

  if (
    receipt &&
    receipt.memoryId !== `${params.scope.scope}:${params.scope.ownerId}`
  ) {
    throw new Errors.CONFLICT();
  }

  if (receipt) {
    return { receipt, roomIds: [] };
  }

  const rooms = await sql<{
    roomId: string;
  }>`select distinct json_extract(source.value, '$.roomId') as roomId
    from memory, json_each(memory.sources) as source
    where memory.organizationId = ${params.organizationId} and memory.scope = ${params.scope.scope}
      and memory.ownerId = ${params.scope.ownerId} and memory.text is not null`.execute(
  deps.database.db,
);

  return { receipt, roomIds: rooms.rows.map((room) => room.roomId) };
}
