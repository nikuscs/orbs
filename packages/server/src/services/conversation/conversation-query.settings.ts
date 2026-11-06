import { conversationWhenBusy } from '@repo/contracts/universal';
import { CONVERSATION } from './conversation.constants';
import type { ConversationServiceDeps } from '../../types/conversation.types';
import type { ConversationSettings } from '@repo/contracts/universal';

export async function conversationQuerySettings({ settings, gifs }: ConversationServiceDeps): Promise<ConversationSettings> {
  const records = await settings.queries.get({ keys: [CONVERSATION.whenBusySetting, CONVERSATION.hideVerboseSetting] });
  const stored = new Map(records.map((record) => [record.key, record.value]));

  return {
    whenBusy: conversationWhenBusy.catch('followUp').parse(stored.get(CONVERSATION.whenBusySetting)),
    hideVerbose: stored.get(CONVERSATION.hideVerboseSetting) !== 'false',
    gifProvider: await gifs.queries.provider(),
  };
}
