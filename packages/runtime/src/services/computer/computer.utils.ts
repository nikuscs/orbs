import { Errors } from '@repo/errors/universal';
import { log } from '@repo/logger/server';
import { match, P } from 'ts-pattern';
import { runtimeBotConversations } from '../runtime/runtime.constants';
import { COMPUTER } from './computer.constants';
import type { ComputerRecord, ComputerSchedule, ComputerTaskDefinition } from '../../types/computer.types';
import type { Context } from '@earendil-works/chord/context';
import type * as PiDurableTypes from '@earendil-works/pi-durable';

export function computerSchedule(record: ComputerRecord, now: number): ComputerSchedule | null {
  const startedAt = record.startedAt ?? now;
  const lifetimeAt = startedAt + COMPUTER.maxLifetimeMs;

  return match(record.state)
    .with('off', () => null)
    .with('running', () => {
      const sleepAt = Math.max((record.lastActivityAt ?? startedAt) + COMPUTER.sleepAfterMs, record.control?.until ?? 0);

      return {
        sleepAt: Math.min(sleepAt, lifetimeAt),
        shutdownAt: lifetimeAt,
        next: match(sleepAt < lifetimeAt)
          .with(true, () => ({ at: sleepAt, transition: 'sleep' as const }))
          .with(false, () => ({ at: lifetimeAt, transition: 'shutdown' as const }))
          .exhaustive(),
      };
    })
    .with('sleeping', () => {
      const shutdownAt = Math.min((record.sleptAt ?? now) + COMPUTER.shutdownAfterMs, lifetimeAt);
      return { sleepAt: null, shutdownAt, next: { at: shutdownAt, transition: 'shutdown' as const } };
    })
    .exhaustive();
}

export function computerControlActive(record: Pick<ComputerRecord, 'control'>, now: number) {
  return match(record.control)
    .with({ until: P.number.gt(now) }, (control) => control)
    .otherwise(() => null);
}

export function computerReset(record: ComputerRecord) {
  record.taskId = null;
  record.state = 'off';
  record.startedAt = null;
  record.lastActivityAt = null;
  record.sleptAt = null;
  record.control = null;
}

export async function computerTaskIsLive(tx: PiDurableTypes.Tx, taskId: number | null) {
  return match(taskId)
    .with(P.nullish, () => false)
    .with(P.number, async (id) => {
      // SAFETY: the record stores the ID returned by createTask; the lookup returns undefined for an unknown ID.
      const task = await tx.task(id as PiDurableTypes.TaskId);

      return match(task)
        .with({ abortRequested: false, state: { status: P.union('pending', 'running', 'waiting', 'sleeping') } }, () => true)
        .otherwise(() => false);
    })
    .exhaustive();
}

export async function computerTaskAbort(harness: PiDurableTypes.Harness, params: { botId: string; taskId: number | null; context: Context }) {
  await match(params.taskId)
    .with(P.number, async (id) => {
      // SAFETY: the record stores the ID returned by createTask; aborting an unknown or finished task is rejected and logged.
      const taskId = id as PiDurableTypes.TaskId;

      await harness.abortTask(taskId, params.context).catch((error: unknown) => log.error({
        tag: 'computer-task',
        message: 'Cannot stop the computer task.',
        botId: params.botId,
        error,
      }));
    })
    .otherwise(() => undefined);
}

export function computerBackoff(failures: number) {
  return Math.min(COMPUTER.retryBackoffMs * 2 ** failures, COMPUTER.retryBackoffMaxMs);
}

export function computerTaskNode(tasks: PiDurableTypes.TaskGraph['tasks'], taskId: number | null | undefined) {
  return match(taskId)
    .with(P.number, (id) => match(tasks[String(id)])
      .with({ kind: COMPUTER.task, abortRequested: false }, (node) => node)
      .otherwise(() => null))
    .otherwise(() => null);
}

export function computerTaskWakeAt(tasks: PiDurableTypes.TaskGraph['tasks'], taskId: number | null | undefined) {
  return match(computerTaskNode(tasks, taskId))
    .with({ state: { status: 'sleeping' } }, ({ state }) => state.until)
    .otherwise(() => null);
}

export async function computerTaskReplace(
  tx: PiDurableTypes.Tx,
  { task, record, botId }: { task: ComputerTaskDefinition; record: ComputerRecord; botId: string },
) {
  const previous = record.taskId;
  const isLive = await computerTaskIsLive(tx, previous);
  const binding = await tx.doc(runtimeBotConversations, botId, null);

  const conversationId = match(binding.conversationId)
    .with(P.nonNullable, (id) => id)
    .otherwise(() => {
      throw new Errors.NOT_FOUND({ resource: 'bot', resourceId: botId });
    });

  record.taskId = await tx.createTask(task, { botId }, {
    conversationId,
    ownership: { kind: 'conversation' },
    background: true,
  });

  return match({ previous, isLive })
    .with({ previous: P.number, isLive: true }, ({ previous: id }) => id)
    .otherwise(() => null);
}

export function computerAttempt(run: () => Promise<void>) {
  return run()
    .then(() => ({ isFailed: false as const }))
    .catch((error: unknown) => ({ isFailed: true as const, error }));
}
