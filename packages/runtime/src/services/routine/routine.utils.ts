import { Errors } from '@repo/errors/universal';
import { match, P } from 'ts-pattern';
import { routineTask } from './routine.task';
import type { RoutineDocument, RoutineRecord } from '../../types/routine.types';
import type { Context } from '@earendil-works/chord/context';
import type { ConversationId, Harness, Tx } from '@earendil-works/pi-durable';
import type { Routine } from '@repo/contracts/universal';

export function routineGet(doc: RoutineDocument, routineId: string): RoutineRecord {
  return match(doc.routines[routineId])
    .with(P.nonNullable, (routine) => routine)
    .otherwise(() => {
      throw new Errors.NOT_FOUND({ resource: 'routine', resourceId: routineId });
    });
}

export function routineCopy(record: RoutineRecord): Routine {
  return {
    id: record.id,
    botId: record.botId,
    conversationId: record.conversationId,
    name: record.name,
    prompt: record.prompt,
    schedule: { ...record.schedule },
    isEnabled: record.isEnabled,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    nextRunAt: record.nextRunAt,
    runRequestedAt: record.runRequestedAt,
    lastRun: match(record.lastRun).with(P.nonNullable, (run) => ({ ...run })).otherwise(() => null),
  };
}

async function routineTaskStatus(tx: Tx, taskId: RoutineRecord['taskId']) {
  return match((await tx.task(taskId))?.state)
    .with({ status: P.union('pending', 'running', 'waiting', 'sleeping'), checkpoint: { phase: 'deliver' } }, () => 'delivering' as const)
    .with({ status: P.union('pending', 'running', 'waiting', 'sleeping') }, () => 'live' as const)
    .otherwise(() => 'ended' as const);
}

export async function routineStaleTask(tx: Tx, taskId: RoutineRecord['taskId']): Promise<RoutineRecord['taskId'] | null> {
  return match(await routineTaskStatus(tx, taskId))
    .with('live', () => taskId)
    .otherwise(() => null);
}

export async function routineReplaceTask(tx: Tx, record: RoutineRecord, conversationId: ConversationId): Promise<RoutineRecord['taskId'] | null> {
  const previous = record.taskId;

  return match(await routineTaskStatus(tx, previous))
    .with('delivering', () => null)
    .with('live', 'ended', async (status) => {
      record.taskId = await tx.createTask(routineTask, { routineId: record.id }, {
        conversationId,
        ownership: { kind: 'conversation' },
        background: true,
      });

      return match(status).with('live', () => previous).otherwise(() => null);
    })
    .exhaustive();
}

export async function routineAbortStale(harness: Harness, taskId: RoutineRecord['taskId'] | null, context: Context): Promise<void> {
  await match(taskId)
    .with(P.nonNullable, (id) => harness.abortTask(id, context))
    .otherwise(() => undefined);
  harness.resume();
}
