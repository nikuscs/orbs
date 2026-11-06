import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { chatQueries } from '../services/chat/chat.client';
import { chatActivity, chatCompaction, chatEntryIds, chatFailure, chatLive, chatMessages, chatOutgoingMessages, chatQueued } from '../services/chat/chat.utils';
import { useChatReactions } from './use-chat-reactions';
import { useRpc } from './use-rpc';
import type { ChatRoomParams } from '../types/chat.types';

export function useChatRoom({ bot, bots, view, outgoing, isMain = false }: ChatRoomParams) {
  const rpcs = useRpc();
  const { conversationId } = view;

  const history = useInfiniteQuery(chatQueries.history(rpcs, {
    botId: bot.id,
    conversationId,
    cursor: view.historyCursor,
  }));

  const { data: pending = [] } = useQuery(rpcs.rpc.tools.pending.queryOptions({ input: { botId: bot.id } }));
  const { data: questions = [] } = useQuery(rpcs.rpc.conversation.questions.queryOptions({ input: { botId: bot.id, conversationId } }));
  const approvals = pending.filter((approval) => approval.conversationId === conversationId || (isMain && approval.privateWith !== null));
  const older = [...(history.data?.pages.flatMap((page) => page.items) ?? [])].reverse();
  const queued = chatQueued(view);

  const messages = chatLive({
    state: view,
    bot,
    approvals,
  }, chatMessages({
    entries: [...older, ...view.entries],
    bot,
    bots,
  }));

  return {
    approvals,
    questions,
    messages,
    sending: chatOutgoingMessages(outgoing, {
      botId: bot.id,
      latestEntryId: view.latestEntryId,
      queued,
    }),
    queued,
    activity: chatActivity(view),
    compaction: chatCompaction(view),
    failure: chatFailure(view),
    isBusy: view.live.run !== undefined || queued.length > 0,
    reactions: useChatReactions({
      botId: bot.id,
      conversationId,
      entryIds: chatEntryIds(messages),
      revision: view.interactionsRevision,
    }),
    older: {
      isEnabled: view.historyCursor !== undefined && (history.hasNextPage || !history.isFetched),
      isLoading: history.isFetching,
      onLoad: () => void history.fetchNextPage(),
    },
  };
}
