import type { ComputerServiceDeps } from '../../types/computer.types';
import type { BotGetInput } from '@repo/contracts/universal';

export async function computerActionStart({ bots, runtime }: ComputerServiceDeps, params: BotGetInput) {
  await bots.actions.configure({ botId: params.botId });
  await runtime.actions.computerStart(params);

  return runtime.queries.computerStatus(params);
}
