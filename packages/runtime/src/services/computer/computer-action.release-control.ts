import { match } from 'ts-pattern';
import { computerDocument } from './computer.constants';
import { computerTaskAbort, computerTaskReplace } from './computer.utils';
import type { ComputerActionDeps, ComputerContextParams, ComputerReleaseControlParams } from '../../types/computer.types';

export async function computerActionReleaseControl(
  { harness, task, botId }: ComputerActionDeps,
  { context, deviceId }: ComputerReleaseControlParams & ComputerContextParams,
) {
  const replaced = await harness.commit(async (tx) => {
    const record = await tx.doc(computerDocument);

    const isHeldByOther = deviceId !== null && record.control !== null && record.control.deviceId !== deviceId;

    return match({ isHeldByOther, state: record.state })
      .with({ isHeldByOther: true }, () => null)
      .with({ state: 'running' }, () => {
        record.control = null;
        record.lastActivityAt = Date.now();

        return computerTaskReplace(tx, {
          task,
          record,
          botId,
        });
      })
      .otherwise(() => {
        record.control = null;

        return null;
      });
  }, context);

  harness.resume();

  await computerTaskAbort(harness, {
    botId,
    taskId: replaced,
    context,
  });
}
