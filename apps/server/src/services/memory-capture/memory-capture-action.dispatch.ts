import { MEMORY } from '#services/memory/memory.constants';
import type { MemoryCaptureActionDispatchParams, MemoryCaptureServiceDeps } from '#/types/memory-capture.types';

export function memoryCaptureActionDispatch(deps: MemoryCaptureServiceDeps, params: MemoryCaptureActionDispatchParams): void {
  const { request, useful } = params;
  const row = deps.database.all(deps.database.db.selectFrom('memoryRoom').selectAll().where('roomId', '=', request.roomId)).at(0);

  if (row?.status !== 'running' || row.requestId !== request.requestId || row.generation !== request.generation) {
    return;
  }

  const daemon = deps.sockets.daemon();
  const runs = deps.database.all(deps.database.db.selectFrom('run').select(['roomId', 'status']).where('status', 'in', ['queued', 'running']));
  const routing = deps.database.all(deps.database.db.selectFrom('routing').select('messageId').limit(1));
  const reactions = deps.database.all(deps.database.db.selectFrom('reaction').leftJoin('message', 'message.reactionId', 'reaction.id').select('reaction.id').where('reaction.roomId', '=', row.roomId).where('reaction.removedAt', 'is', null).where('message.id', 'is', null).limit(1));

  if (reactions.length || routing.length || !daemon || runs.length >= daemon.maxTurns || runs.some((run) => run.roomId === row.roomId || run.status === 'queued')) {
    deps.database.run(deps.database.db.updateTable('memoryRoom').set({
      status: 'pending',
      requestId: null,
      dueAt: Date.now() + MEMORY.debounceMs,
    }).where('roomId', '=', row.roomId));
    return;
  }
  deps.database.run(deps.database.db.updateTable('memoryRoom').set({ captureFacts: useful ? 1 : 0, dueAt: Date.now() + MEMORY.timeoutMs }).where('roomId', '=', row.roomId));
  daemon.send({ ...request, instructions: deps.instructions(useful) });
}
