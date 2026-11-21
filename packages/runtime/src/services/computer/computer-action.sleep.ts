import { match } from 'ts-pattern';
import { computerDocument } from './computer.constants';
import type { ComputerContextParams, ComputerServiceDeps } from '../../types/computer.types';

export async function computerActionSleep({ harness, host, botId }: ComputerServiceDeps, { context }: ComputerContextParams) {
  await match(await host.queries.state({ botId }))
    .with('running', () => host.actions.sleep({ botId }))
    .otherwise(() => undefined);

  await harness.commit(async (tx) => {
    const record = await tx.doc(computerDocument);

    match(record.state)
      .with('running', () => {
        record.state = 'sleeping';
        record.sleptAt = Date.now();
      })
      .otherwise(() => undefined);
  }, context);
}
