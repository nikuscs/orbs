import { ROOM } from './room.constants';
import type { DatabaseTenantMessage } from '#/types/database-tenant.types';
import type { RoomQueryHistoryParams, RoomServiceDeps } from '#/types/room.types';

export function roomQueryHistory(deps: RoomServiceDeps, params: RoomQueryHistoryParams): DatabaseTenantMessage[] | null {
  const { db } = deps.database;

  const before = deps.database.all(db
    .selectFrom('message')
    .select('seq')
    .where('roomId', '=', params.roomId)
    .where('id', '=', params.before)).at(0);

  if (!before) {
    return null;
  }

  return deps.database.all(db
    .selectFrom('message')
    .selectAll()
    .where('roomId', '=', params.roomId)
    .where('seq', '<', before.seq)
    .where('reactionId', 'is', null)
    .orderBy('seq', 'desc')
    .limit(ROOM.historyLimit)).reverse();
}
