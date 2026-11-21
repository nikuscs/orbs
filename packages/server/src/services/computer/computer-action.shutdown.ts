import type { ComputerServiceDeps } from '../../types/computer.types';
import type { BotGetInput } from '@repo/contracts/universal';

export async function computerActionShutdown({ bots, runtime }: ComputerServiceDeps, params: BotGetInput) {
  await bots.actions.configure({ botId: params.botId });
  await runtime.actions.computerShutdown(params);

  return runtime.queries.computerStatus(params);
}
