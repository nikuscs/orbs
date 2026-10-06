import { roomQueryGet } from './room-query.get';
import { ROOM } from './room.constants';
import type { RoomQueryTimelineParams, RoomServiceDeps, RoomTimeline } from '#/types/room.types';

export function roomQueryTimeline(deps: RoomServiceDeps, params: RoomQueryTimelineParams): RoomTimeline | null {
  const room = roomQueryGet(deps, params);

  if (!room) {
    return null;
  }

  const { db } = deps.database;

  const messages = deps.database.all(db
    .selectFrom('message')
    .selectAll()
    .where('roomId', '=', params.roomId)
    .where('reactionId', 'is', null)
    .orderBy('seq', 'desc')
    .limit(params.limit ?? ROOM.timelineLimit)).reverse();

  return { room, messages, runs: deps.run.queries.room(params) };
}
