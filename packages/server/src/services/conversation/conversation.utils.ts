import { match, P } from 'ts-pattern';
import type { BotPreferences } from '../../types/bot.types';
import type { Bot, ConversationPreferences, ConversationSummary } from '@repo/contracts/universal';
import type { ConversationIndexSummary } from '@repo/runtime/server';

export function conversationSummaries(summaries: ConversationIndexSummary[], preferences: Map<string, BotPreferences>): ConversationSummary[] {
  return summaries.flatMap((summary) => match(preferences.get(summary.botId))
    .with(P.nonNullable, (preference) => [{
      botId: summary.botId,
      conversationId: summary.conversationId,
      lastMessage: summary.lastMessage,
      isRunning: summary.isRunning,
      isWorking: summary.isWorking,
      ...conversationPreferencesView(preference, summary.lastAssistantEntryId),
    }])
    .otherwise(() => []));
}

export function conversationPreferencesView(preference: BotPreferences, lastAssistantEntryId: number): ConversationPreferences {
  return {
    isPinned: preference.isPinned,
    isHidden: preference.isHidden,
    isMuted: preference.isMuted,
    mutedUntil: preference.mutedUntil,
    rank: preference.rank,
    sectionId: preference.sectionId,
    readThroughEntryId: preference.readThroughEntryId,
    hasUnread: lastAssistantEntryId > preference.readThroughEntryId,
    whenBusy: preference.whenBusy,
  };
}

export function conversationListItems(botList: Bot[], conversations: ConversationSummary[]) {
  const summaries = new Map(conversations.map((conversation) => [conversation.botId, conversation]));

  return botList.flatMap((bot) => {
    const summary = summaries.get(bot.id);

    return match(summary)
      .with(P.nonNullable, (conversation) => [{ ...conversation, name: bot.name, handle: bot.handle, avatar: bot.avatar }])
      .otherwise(() => []);
  }).sort((left, right) => Number(left.isHidden) - Number(right.isHidden)
    || Number(right.isPinned) - Number(left.isPinned)
    || (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER)
    || (right.lastMessage?.createdAt ?? 0) - (left.lastMessage?.createdAt ?? 0)
    || left.botId.localeCompare(right.botId));
}
