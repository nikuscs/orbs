import { ENTRY } from '@repo/contracts/universal';
import { botPromptsStart } from './bot.prompts';
import type { BotServiceDeps } from '../../types/bot.types';
import type { BotGetInput } from '@repo/contracts/universal';

export function botActionStart(deps: BotServiceDeps, { botId }: BotGetInput) {
  return deps.runtime.actions.submit({
    botId,
    requestId: `bots.start:${botId}`,
    content: botPromptsStart,
    whenBusy: 'followUp',
    entry: { kind: ENTRY.botStart, data: {} },
  });
}
