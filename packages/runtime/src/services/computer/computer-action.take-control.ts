import { match } from 'ts-pattern';
import { computerDocument } from './computer.constants';
import type { ComputerContextParams, ComputerServiceDeps, ComputerTakeControlParams } from '../../types/computer.types';

export async function computerActionTakeControl(
  { harness }: ComputerServiceDeps,
  { context, ...control }: ComputerTakeControlParams & ComputerContextParams,
) {
  await harness.commit(async (tx) => {
    const record = await tx.doc(computerDocument);
    record.control = { deviceId: control.deviceId, deviceName: control.deviceName, until: control.until };

    match(record.state)
      .with('running', () => {
        record.lastActivityAt = Date.now();
      })
      .otherwise(() => undefined);
  }, context);
}
