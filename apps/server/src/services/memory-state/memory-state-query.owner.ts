import { Errors } from '@orbs/errors/universal';
import type { MemoryStateQueryOwnerParams, MemoryStateServiceDeps } from '#/types/memory-state.types';

export async function memoryStateQueryOwner(deps: MemoryStateServiceDeps, params: MemoryStateQueryOwnerParams): Promise<void> {
  if (
    params.scope.scope === 'room' &&
    !deps.database.all(deps.database.db.selectFrom('room').select('id').where('id', '=', params.scope.ownerId)).length
  ) {
    throw new Errors.NOT_FOUND({ resource: 'room' });
  }

  if (
    params.scope.scope === 'bot' &&
    !(await deps.bots.queries.get({ organizationId: deps.organizationId, botId: params.scope.ownerId }))
  ) {
    throw new Errors.NOT_FOUND({ resource: 'bot' });
  }
}
