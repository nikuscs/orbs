import { Errors } from '@repo/errors/universal';
import { log } from '@repo/logger/server';
import { match, P } from 'ts-pattern';
import { runtimeBotConversations } from '../runtime/runtime.constants';
import { computerActionShutdown } from './computer-action.shutdown';
import { computerDocument } from './computer.constants';
import { computerTaskAbort, computerTaskIsLive, computerTaskReplace } from './computer.utils';
import type { ComputerActionDeps, ComputerContextParams } from '../../types/computer.types';

export async function computerActionStart(
  { harness, host, botId, task }: ComputerActionDeps,
  { context }: ComputerContextParams,
) {
  const binding = await harness.snapshot(runtimeBotConversations, botId, context);

  match(binding?.conversationId)
    .with(P.nullish, () => {
      throw new Errors.NOT_FOUND({ resource: 'bot', resourceId: botId });
    })
    .otherwise(() => undefined);

  const wasAwake = (await harness.snapshot(computerDocument, context))?.state === 'running';

  await host.actions.start({ botId }).catch(async (error: unknown) => {
    await match(wasAwake)
      .with(true, () => undefined)
      .with(false, () => computerActionShutdown({
        harness,
        host,
        botId,
      }, { context }).catch((cause: unknown) => log.error({
        tag: 'computer',
        message: 'Cannot shut down a computer that failed to start.',
        botId,
        error: cause,
      })))
      .exhaustive();

    throw error;
  });

  const replaced = await harness.commit(async (tx) => {
    const record = await tx.doc(computerDocument);
    const now = Date.now();
    const wasRunning = record.state === 'running';

    record.startedAt = match(record.state)
      .with('off', () => now)
      .otherwise(() => record.startedAt ?? now);
    record.state = 'running';
    record.lastActivityAt = now;
    record.sleptAt = null;

    const isLive = await computerTaskIsLive(tx, record.taskId);

    return match(wasRunning && isLive)
      .with(true, () => null)
      .with(false, () => computerTaskReplace(tx, {
        task,
        record,
        botId,
      }))
      .exhaustive();
  }, context);

  harness.resume();

  await computerTaskAbort(harness, {
    botId,
    taskId: replaced,
    context,
  });
}
