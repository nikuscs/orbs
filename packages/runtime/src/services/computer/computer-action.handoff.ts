import { computerDocument } from './computer.constants';
import type { ComputerContextParams, ComputerHandoffParams, ComputerServiceDeps } from '../../types/computer.types';

export async function computerActionHandoff({ harness }: ComputerServiceDeps, { context, ...handoff }: ComputerHandoffParams & ComputerContextParams) {
  await harness.commit(async (tx) => {
    const record = await tx.doc(computerDocument);
    record.handoff = handoff;
  }, context);
}
