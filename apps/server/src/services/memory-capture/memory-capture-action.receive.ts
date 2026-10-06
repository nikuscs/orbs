import { memoryCaptureActionApply } from './memory-capture-action.apply';
import { memoryCaptureActionFail } from './memory-capture-action.fail';
import type { DaemonMemoryResult } from '#/types/daemon.types';
import type { MemoryCaptureServiceDeps } from '#/types/memory-capture.types';

export async function memoryCaptureActionReceive(deps: MemoryCaptureServiceDeps, params: DaemonMemoryResult): Promise<void> {
  const row = deps.database.all(deps.database.db.selectFrom('memoryRoom').selectAll().where('roomId', '=', params.roomId)).at(0);

  if (row?.status !== 'running' || row.requestId !== params.requestId || row.generation !== params.generation) {
    return;
  }

  const model = (await deps.organization.queries.settings({ organizationId: deps.organizationId })).memory.model;

  if (JSON.stringify(model) !== row.model) {
    memoryCaptureActionFail(deps, { roomId: row.roomId, error: 'model_changed' });
    return;
  }

  deps.database.run(
    deps.database.db
      .updateTable('memoryRoom')
      .set({ usage: JSON.stringify(params.usage) })
      .where('roomId', '=', row.roomId),
  );

  if (!params.result) {
    memoryCaptureActionFail(deps, { roomId: row.roomId, error: params.error ?? 'invalid_result' });
    return;
  }

  deps.database.run(
    deps.database.db
      .updateTable('memoryRoom')
      .set({
        status: 'applying',
        result: JSON.stringify(params.result),
        dueAt: Date.now(),
      })
      .where('roomId', '=', row.roomId),
  );
  await memoryCaptureActionApply(deps, { roomId: row.roomId });
}
