import type { ComputerServiceDeps } from '../../types/computer.types';
import type { BotGetInput } from '@repo/contracts/universal';

export async function computerActionSleep({ bots, runtime }: ComputerServiceDeps, params: BotGetInput) {
  await bots.actions.configure({ botId: params.botId });
  await runtime.actions.computerSleep(params);

  return runtime.queries.computerStatus(params);
}
