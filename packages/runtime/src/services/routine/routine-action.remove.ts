import { routineDocument } from './routine.constants';
import { routineAbortStale, routineGet, routineStaleTask } from './routine.utils';
import type { RoutineContextParams, RoutineServiceDeps, RoutineTargetParams } from '../../types/routine.types';

export async function routineActionRemove({ harness }: RoutineServiceDeps, { context, ...params }: RoutineTargetParams & RoutineContextParams) {
  const staleTaskId = await harness.commit(async (tx) => {
    const doc = await tx.doc(routineDocument, params.conversationId);
    const record = routineGet(doc, params.routineId);
    const stale = await routineStaleTask(tx, record.taskId);
    doc.routines = Object.fromEntries(Object.entries(doc.routines).filter(([id]) => id !== params.routineId));

    return stale;
  }, context);

  await routineAbortStale(harness, staleTaskId, context);
}
