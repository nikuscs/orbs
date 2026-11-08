import type { ComputerServiceDeps } from '../../types/computer.types';
import type { BotGetInput } from '@repo/contracts/universal';

export async function computerActionThumbnail({ bots, runtime }: ComputerServiceDeps, params: BotGetInput) {
  await bots.queries.get({ botId: params.botId });
  return runtime.actions.computerThumbnail(params);
}
