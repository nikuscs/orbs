import { match } from 'ts-pattern';
import { computerActionStart } from './computer-action.start';
import { computerDocument } from './computer.constants';
import type { ComputerActionDeps, ComputerContextParams } from '../../types/computer.types';

export async function computerActionTouch(deps: ComputerActionDeps, { context }: ComputerContextParams) {
  const state = await deps.harness.commit(async (tx) => {
    const record = await tx.doc(computerDocument);

    match(record.state)
      .with('running', () => {
        record.lastActivityAt = Date.now();
      })
      .otherwise(() => undefined);

    return record.state;
  }, context);

  await match(state)
    .with('sleeping', () => computerActionStart(deps, { context }))
    .otherwise(() => undefined);
}
