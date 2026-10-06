import { Errors } from '@orbs/errors/universal';
import type { MemoryStateQuerySourcesParams, MemoryStateServiceDeps } from '#/types/memory-state.types';

export function memoryStateQuerySources(deps: MemoryStateServiceDeps, params: MemoryStateQuerySourcesParams) {
  if (params.ids.length === 0) {
    return [];
  }

  const sources = deps.database.all(
    deps.database.db
      .selectFrom('message')
      .select(['roomId', 'id as messageId', 'seq', 'authorId'])
      .where('roomId', '=', params.roomId)
      .where('id', 'in', [...new Set(params.ids)])
      .where('role', '=', 'user')
      .where('reactionId', 'is', null),
  );

  if (sources.length !== new Set(params.ids).size) {
    throw new Errors.FORBIDDEN();
  }

  return sources;
}
