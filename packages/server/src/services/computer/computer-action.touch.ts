import type { ComputerServiceDeps } from '../../types/computer.types';
import type { BotGetInput } from '@repo/contracts/universal';

export async function computerActionTouch({ bots, runtime }: ComputerServiceDeps, params: BotGetInput) {
  await bots.queries.get({ botId: params.botId });
  await runtime.actions.computerTouch(params);

  return runtime.queries.computerStatus(params);
}
