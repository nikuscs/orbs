import { match } from 'ts-pattern';
import { computerDocument } from './computer.constants';
import { computerTaskAbort, computerTaskReplace } from './computer.utils';
import type { ComputerActionDeps, ComputerContextParams } from '../../types/computer.types';

export async function computerActionReleaseControl({ harness, task, botId }: ComputerActionDeps, { context }: ComputerContextParams) {
  const replaced = await harness.commit(async (tx) => {
    const record = await tx.doc(computerDocument);
    record.control = null;

    return match(record.state)
      .with('running', () => {
        record.lastActivityAt = Date.now();

        return computerTaskReplace(tx, {
          task,
          record,
          botId,
        });
      })
      .otherwise(() => null);
  }, context);

  harness.resume();

  await computerTaskAbort(harness, {
    botId,
    taskId: replaced,
    context,
  });
}
