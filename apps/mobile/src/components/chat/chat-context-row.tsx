import { useChatContextUsage } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { Icon } from '@/components/ui/icon';
import { ItemButton, ItemContent, ItemTitle } from '@/components/ui/item';
import { Text } from '@/components/ui/text';
import type { ConversationListItem } from '@repo/contracts/universal';

interface ChatContextRowProps {
  chat: ConversationListItem;
}

export function ChatContextRow({ chat }: ChatContextRowProps) {
  const router = useRouter();
  const [muted, warning, destructive] = useCSSVariable(['--color-muted-foreground', '--color-warning', '--color-destructive']).map(String);

  const usage = useChatContextUsage({
    botId: chat.botId,
    conversationId: chat.conversationId,
    revision: chat.isRunning ? undefined : chat.lastMessage?.entryId,
  });

  const context = usage.context;
  const color = { muted, warning, destructive }[context?.tone ?? 'muted'];
  const circumference = 2 * Math.PI * 6;

  return (
    <ItemButton
      accessibilityLabel={context?.label ?? m.rooms_context_title()}
      size="sm"
      onPress={() => router.push({ pathname: '/chat/[botId]/context', params: { botId: chat.botId, conversationId: String(chat.conversationId) } })}
    >
      <ItemContent>
        <ItemTitle>{m.rooms_context_title()}</ItemTitle>
      </ItemContent>
      {context === null || context.percent === null ? null : (
        <Svg
          height={16}
          style={{ transform: [{ rotate: '-90deg' }] }}
          viewBox="0 0 16 16"
          width={16}
        >
          <Circle
            cx={8}
            cy={8}
            fill="none"
            opacity={0.25}
            r={6}
            stroke={color}
            strokeWidth={2}
          />
          <Circle
            cx={8}
            cy={8}
            fill="none"
            r={6}
            stroke={color}
            strokeDasharray={`${(context.percent / 100) * circumference} ${circumference}`}
            strokeLinecap="round"
            strokeWidth={2}
          />
        </Svg>
      )}
      {context ? (
        <Text tone={context.tone} variant="item-description">{context.shown ?? `~${context.used}`}</Text>
      ) : null}
      <Icon
        icon={ChevronRight}
        size="sm"
        tone="muted"
      />
    </ItemButton>
  );
}
