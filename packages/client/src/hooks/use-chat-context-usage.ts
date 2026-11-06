import { getLocale, m } from '@repo/i18n/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { match, P } from 'ts-pattern';
import { CHAT } from '../services/chat/chat.constants';
import { useRpc } from './use-rpc';
import type { ChatContextUsageParams, ChatContextView } from '../types/chat.types';
import type { ConversationContextUsage } from '@repo/contracts/universal';

function chatContextView({ contextWindow, estimatedTokens }: ConversationContextUsage): ChatContextView {
  const number = new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 1 });

  const chatTokens = (value: number) => match(value)
    .with(P.number.gte(1_000_000), (count) => `${number.format(count / 1_000_000)}M`)
    .with(P.number.gte(1000), (count) => `${number.format(count / 1000)}K`)
    .otherwise((count) => number.format(count));

  const used = chatTokens(estimatedTokens);
  const percent = contextWindow ? Math.min(100, Math.round((estimatedTokens / contextWindow) * 100)) : null;
  const shown = percent === null ? null : new Intl.NumberFormat(getLocale(), { style: 'percent' }).format(percent / 100);

  return {
    percent,
    shown,
    used,
    label: shown ? m.rooms_context_full({ percent: shown }) : m.rooms_context_tokens_only({ used }),
    tokens: contextWindow ? m.rooms_context_tokens({ used, total: chatTokens(contextWindow) }) : m.rooms_context_tokens_only({ used }),
    tone: match(percent)
      .with(P.number.gte(CHAT.contextCriticalPercent), () => 'destructive' as const)
      .with(P.number.gte(CHAT.contextWarningPercent), () => 'warning' as const)
      .otherwise(() => 'muted' as const),
  };
}

export function useChatContextUsage({ botId, conversationId, revision, onCompacted }: ChatContextUsageParams) {
  const { rpc } = useRpc();
  const queryClient = useQueryClient();
  const queryKey = rpc.conversation.contextUsage.key({ input: { botId, conversationId } });
  const usage = useQuery({ ...rpc.conversation.contextUsage.queryOptions({ input: { botId, conversationId } }), retry: false });

  const compact = useMutation(rpc.commands.execute.mutationOptions({
    meta: { error: m.rooms_context_compact_failed(), invalidates: [queryKey] },
    onSuccess: ({ compacted }) => match(compacted)
      .with(true, () => onCompacted?.(m.rooms_context_compacted()))
      .with(false, () => onCompacted?.(m.rooms_context_compact_nothing()))
      .otherwise(() => undefined),
  }));

  useEffect(() => {
    if (revision === undefined) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: rpc.conversation.contextUsage.key({ input: { botId, conversationId } }) });
  }, [botId, conversationId, queryClient, revision, rpc]);

  return {
    context: usage.data ? chatContextView(usage.data) : null,
    isCompactable: usage.data?.compactable ?? false,
    isCompacting: compact.isPending,
    compact: () => compact.mutate({
      botId,
      conversationId,
      name: 'compact',
    }),
  };
}
