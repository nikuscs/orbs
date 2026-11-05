import { match } from 'ts-pattern';
import { routineScheduleNextRunAt } from './routine-schedule.utils';
import { routineDocument } from './routine.constants';
import { routineAbortStale, routineCopy, routineGet, routineReplaceTask } from './routine.utils';
import type { RoutineContextParams, RoutineServiceDeps, RoutineUpdateParams } from '../../types/routine.types';

export async function routineActionUpdate({ harness }: RoutineServiceDeps, { context, ...params }: RoutineUpdateParams & RoutineContextParams) {
  const { routine, staleTaskId: replacedTaskId } = await harness.commit(async (tx) => {
    const doc = await tx.doc(routineDocument, params.conversationId);
    const record = routineGet(doc, params.routineId);
    const schedule = params.schedule ?? record.schedule;
    const now = Date.now();
    const nextRunAt = routineScheduleNextRunAt(schedule, now);
    const isEnabled = params.isEnabled ?? record.isEnabled;
    const shouldReschedule = params.schedule !== undefined || isEnabled !== record.isEnabled;
    record.name = params.name ?? record.name;
    record.prompt = params.prompt ?? record.prompt;
    record.schedule = { ...schedule };
    record.isEnabled = isEnabled;
    record.nextRunAt = match({ isEnabled, shouldReschedule })
      .with({ isEnabled: false }, () => null)
      .with({ shouldReschedule: true }, () => nextRunAt)
      .otherwise(() => record.nextRunAt);
    record.revision += 1;
    record.scheduleRevision += Number(shouldReschedule);
    record.updatedAt = now;

    const staleTaskId = await routineReplaceTask(tx, record, params.conversationId);

    return { routine: routineCopy(record), staleTaskId };
  }, context);

  await routineAbortStale(harness, replacedTaskId, context);

  return routine;
}
