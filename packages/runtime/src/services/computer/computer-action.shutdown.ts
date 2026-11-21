import { computerDocument } from './computer.constants';
import { computerReset, computerTaskAbort } from './computer.utils';
import type { ComputerContextParams, ComputerServiceDeps } from '../../types/computer.types';

export async function computerActionShutdown({ harness, host, botId }: ComputerServiceDeps, { context }: ComputerContextParams) {
  await host.actions.shutdown({ botId });

  const previous = await harness.commit(async (tx) => {
    const record = await tx.doc(computerDocument);
    const taskId = record.taskId;
    computerReset(record);

    return taskId;
  }, context);

  await computerTaskAbort(harness, {
    botId,
    taskId: previous,
    context,
  });
}
