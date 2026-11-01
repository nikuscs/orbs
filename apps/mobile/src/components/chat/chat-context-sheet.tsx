import { useChatContextUsage } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FoldVertical, RotateCcw, TriangleAlert } from 'lucide-react-native';
import { View } from 'react-native';
import { match, P } from 'ts-pattern';
import { ActionSheet, ActionSheetGroup, ActionSheetItem } from '@/components/ui/action-sheet';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useConnection } from '@/hooks/use-connection';
import { cn } from '@/lib/cn';
import type { RpcSession } from '@/types/rpc.types';

interface ChatContextSheetProps {
  botId: string;
  conversationId: number;
}

export function ChatContextSheet({ botId, conversationId }: ChatContextSheetProps) {
  const { session } = useConnection();

  return match(session)
    .with(P.nonNullable, (current) => (
      <ChatContextSheetContent
        botId={botId}
        conversationId={conversationId}
        session={current}
      />
    ))
    .otherwise(() => null);
}

interface ChatContextSheetContentProps extends ChatContextSheetProps {
  session: RpcSession;
}

function ChatContextSheetContent({ session, botId, conversationId }: ChatContextSheetContentProps) {
  const router = useRouter();
  const bots = useQuery(session.rpc.bots.list.queryOptions());
  const name = bots.data?.find((item) => item.id === botId)?.name ?? '';
  const usage = useChatContextUsage({ botId, conversationId });

  if (!usage.context) {
    return null;
  }

  const { percent, shown, tokens, tone } = usage.context;

  return (
    <ActionSheet>
      <View className="gap-2 px-1">
        <View className="flex-row items-center justify-between">
          <Text variant="heading">{m.rooms_context_title()}</Text>
          {shown ? (
            <View className="flex-row items-center gap-1">
              {tone === 'muted' ? null : (
                <Icon
                  icon={TriangleAlert}
                  size="sm"
                  tone={tone}
                />
              )}
              <Text tone={tone} variant="item-description">{shown}</Text>
            </View>
          ) : null}
        </View>
        {percent === null ? null : (
          <View className="h-1 overflow-hidden rounded-full bg-secondary">
            <View className={cn('h-full rounded-full', { muted: 'bg-foreground', warning: 'bg-warning', destructive: 'bg-destructive' }[tone])} style={{ width: `${percent}%` }} />
          </View>
        )}
        <Text variant="muted">{tokens}</Text>
      </View>
      <ActionSheetGroup>
        <ActionSheetItem
          disabled={usage.isCompacting}
          icon={FoldVertical}
          onPress={() => {
            usage.compact();
            router.back();
          }}
        >
          {m.mobile_context_compact()}
        </ActionSheetItem>
        <ActionSheetItem icon={RotateCcw} onPress={() => router.replace({ pathname: '/chat/[botId]/reset', params: { botId } })}>
          {m.mobile_context_reset()}
        </ActionSheetItem>
      </ActionSheetGroup>
      <Text
        className="mx-5"
        tone="muted"
        variant="small"
      >
        {m.rooms_context_estimate({ bot: name })}
      </Text>
    </ActionSheet>
  );
}
