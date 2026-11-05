import { m } from '@repo/i18n/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { match } from 'ts-pattern';
import { chatContextView } from '../services/chat/chat.utils';
import { useRpc } from './use-rpc';
import type { ChatContextUsageParams } from '../types/chat.types';

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
