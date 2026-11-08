import type { ComputerServiceDeps } from '../../types/computer.types';
import type { BotGetInput } from '@repo/contracts/universal';

export async function computerQueryStatus({ bots, runtime }: ComputerServiceDeps, params: BotGetInput) {
  await bots.queries.get({ botId: params.botId });
  return runtime.queries.computerStatus(params);
}
