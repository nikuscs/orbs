import { runPromptsLine } from './run.prompts';
import type { RoomMessageRoute } from '#/types/room.types';
import type { RunActionSteerParams, RunServiceDeps } from '#/types/run.types';

export function runActionSteer(deps: RunServiceDeps, params: RunActionSteerParams): boolean {
  const { db } = deps.database;

  const accepted = deps.database.all(db
    .selectFrom('run')
    .select(['id', 'botId', 'botName'])
    .where('roomId', '=', params.message.roomId)
    .where('status', '=', 'running')
    .where('seat', '=', 'required')
    .where('acceptedAt', 'is not', null)).at(0);

  const daemon = deps.sockets.daemon();

  if (!accepted || !daemon) {
    return false;
  }

  const route: RoomMessageRoute = { via: 'steer', picks: [{ botId: accepted.botId, botName: accepted.botName, score: null }] };

  daemon.send({
    type: 'run.steer',
    runId: accepted.id,
    messageId: params.message.id,
    text: runPromptsLine({
      ...params.message,
      reactionEmoji: null,
      reactionRemovedAt: null,
    }),
  });
  deps.database.run(db
    .updateTable('message')
    .set({ route: JSON.stringify(route) })
    .where('id', '=', params.message.id));
  deps.sockets.broadcast({
    type: 'message.routed',
    roomId: params.message.roomId,
    messageId: params.message.id,
    route,
  });

  return true;
}
