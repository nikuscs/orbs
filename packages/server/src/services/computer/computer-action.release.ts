import type { ComputerServiceDeps } from '../../types/computer.types';
import type { BotGetInput } from '@repo/contracts/universal';

export async function computerActionRelease({ bots, runtime }: ComputerServiceDeps, params: BotGetInput) {
  await bots.queries.get({ botId: params.botId });
  await runtime.actions.computerReleaseControl(params);

  return runtime.queries.computerStatus(params);
}
