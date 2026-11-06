import { conversationQuerySettings } from './conversation-query.settings';
import { CONVERSATION } from './conversation.constants';
import type { ConversationServiceDeps } from '../../types/conversation.types';
import type { ConversationConfigureInput } from '@repo/contracts/universal';

export async function conversationActionConfigure(deps: ConversationServiceDeps, { whenBusy, hideVerbose, gifProvider }: ConversationConfigureInput) {
  if (gifProvider) {
    await deps.gifs.actions.configure({ provider: gifProvider });
  }

  await deps.settings.actions.set({
    records: [
      ...(whenBusy ? [{ key: CONVERSATION.whenBusySetting, value: whenBusy }] : []),
      ...(hideVerbose === undefined ? [] : [{ key: CONVERSATION.hideVerboseSetting, value: String(hideVerbose) }]),
    ],
  });

  return conversationQuerySettings(deps);
}
