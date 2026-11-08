import { Errors } from '@repo/errors/universal';
import { match } from 'ts-pattern';
import { computerDocument } from './computer.constants';
import { computerControlActive } from './computer.utils';
import type { ComputerContextParams, ComputerServiceDeps, ComputerTakeControlParams } from '../../types/computer.types';

export async function computerActionTakeControl(
  { harness }: ComputerServiceDeps,
  { context, isRenewal = false, ...control }: ComputerTakeControlParams & ComputerContextParams,
) {
  const isTaken = await harness.commit(async (tx) => {
    const record = await tx.doc(computerDocument);
    const isHeld = computerControlActive(record, Date.now())?.deviceId === control.deviceId;

    if (isRenewal && !isHeld) {
      return false;
    }

    record.control = { deviceId: control.deviceId, deviceName: control.deviceName, until: control.until };

    match(record.state)
      .with('running', () => {
        record.lastActivityAt = Date.now();
      })
      .otherwise(() => undefined);

    return true;
  }, context);

  if (!isTaken) {
    throw new Errors.CONFLICT({ internal: 'This device no longer controls the computer.' });
  }
}
