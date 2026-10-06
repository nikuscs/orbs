import { sql } from 'kysely';
import type { MemoryCaptureQueryStatusParams, MemoryCaptureServiceDeps } from '#/types/memory-capture.types';

export function memoryCaptureQueryStatus(deps: MemoryCaptureServiceDeps, params: MemoryCaptureQueryStatusParams) {
  const row = deps.database
    .all(
      deps.database.db
        .selectFrom('memoryRoom')
        .select(['enabled', 'status', 'cursor', 'throughSeq', 'error', 'dueAt', 'recapThrough', 'usage'])
        .select(sql<number>`source IS NOT NULL`.as('canSkip'))
        .where('roomId', '=', params.roomId),
    )
    .at(0);

  return row ?? null;
}
