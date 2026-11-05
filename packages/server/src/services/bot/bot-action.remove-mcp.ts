import { botActionConfigure } from './bot-action.configure';
import type { BotServiceDeps } from '../../types/bot.types';
import type { McpServerRemoveInput } from '@repo/contracts/universal';

export async function botActionRemoveMcp(deps: BotServiceDeps, params: McpServerRemoveInput) {
  await deps.mcp.actions.remove(params);
  return botActionConfigure(deps, { botId: params.botId });
}
