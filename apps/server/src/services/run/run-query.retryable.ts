import { runRoom } from './run.utils';
import type { RunQueryRetryableParams, RunRoom, RunServiceDeps } from '#/types/run.types';

export function runQueryRetryable(deps: RunServiceDeps, params: RunQueryRetryableParams): RunRoom[] {
  const rows = deps.database.all(deps.database.db
    .selectFrom('run as ended')
    .innerJoin('member', (join) => join.onRef('member.roomId', '=', 'ended.roomId').onRef('member.botId', '=', 'ended.botId'))
    .select(['ended.id', 'ended.roomId', 'ended.botId', 'ended.botName', 'ended.status', 'ended.failure', 'ended.activity', 'ended.seat'])
    .where('ended.roomId', '=', params.roomId)
    .where('ended.status', 'in', ['failed', 'interrupted'])
    .where('ended.seat', '!=', 'optional')
    .where((eb) => eb.not(eb.exists(eb.selectFrom('run as newer')
      .select('newer.id')
      .whereRef('newer.roomId', '=', 'ended.roomId')
      .whereRef('newer.botId', '=', 'ended.botId')
      .whereRef('newer.createdAt', '>', 'ended.createdAt'))))
    .where((eb) => eb.not(eb.exists(eb.selectFrom('message')
      .select('message.id')
      .whereRef('message.roomId', '=', 'ended.roomId')
      .where('message.role', '=', 'user')
      .where('message.reactionId', 'is', null)
      .whereRef('message.createdAt', '>', 'ended.updatedAt')))));

  return rows.map(runRoom);
}
