import { MEMORY } from '#services/memory/memory.constants';
import type { MemoryCaptureActionFailParams, MemoryCaptureServiceDeps } from '#/types/memory-capture.types';

export function memoryCaptureActionFail(deps: MemoryCaptureServiceDeps, params: MemoryCaptureActionFailParams): void {
  const row = deps.database
    .all(deps.database.db.selectFrom('memoryRoom').select(['attempt', 'result', 'requestId']).where('roomId', '=', params.roomId))
    .at(0);

  const attempt = row?.attempt ?? 0;
  const retry = MEMORY.retryMs.at(attempt);
  deps.database.run(
    deps.database.db
      .updateTable('memoryRoom')
      .set({
        status: retry === undefined ? 'paused' : 'pending',
        dueAt: retry === undefined ? null : Date.now() + retry,
        attempt: attempt + 1,
        requestId: row?.result ? row.requestId : null,
        error: params.error,
      })
      .where('roomId', '=', params.roomId),
  );
  deps.sockets.broadcast({ type: 'memory.updated' });
}
