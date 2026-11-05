import { m } from '@repo/i18n/client';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { BotMention } from '@/components/bots/bot-mention';
import { messageSurface } from '@/components/ui/message';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';
import { CHAT_TYPING } from '@/services/chat/chat.constants';
import type { Bot } from '@repo/contracts/universal';

interface ChatTypingProps {
  label?: string;
  peer?: Pick<Bot, 'name'> & Partial<Pick<Bot, 'avatar'>>;
  elapsed?: string;
  accessibilityLabel: string;
}

export function ChatTyping({ label, peer, elapsed, accessibilityLabel }: ChatTypingProps) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      className="flex-row items-center gap-3 px-5"
    >
      <View className={cn(messageSurface, 'h-7 flex-row items-center gap-1 rounded-full px-3')}>
        {[0, 1, 2].map((index) => (
          <Animated.View
            className="size-1.5 rounded-full bg-muted-foreground"
            key={index}
            style={{ ...CHAT_TYPING.dot, animationDelay: index * CHAT_TYPING.dotDelayMs }}
          />
        ))}
      </View>
      {peer ? (
        <Animated.View className="shrink flex-row items-center gap-1.5" style={CHAT_TYPING.label}>
          <Text
            tone="muted"
            variant="item-description"
          >
            {m.rooms_activity_asking()}
          </Text>
          <BotMention animate bot={peer} />
        </Animated.View>
      ) : null}
      {label && !peer ? (
        <Animated.View className="shrink" style={CHAT_TYPING.label}>
          <Text
            numberOfLines={2}
            tone="muted"
            variant="item-description"
          >{label}</Text>
        </Animated.View>
      ) : null}
      {elapsed ? (
        <Text
          className="shrink-0 tabular-nums"
          tone="muted"
          variant="item-description"
        >
          {elapsed}
        </Text>
      ) : null}
    </View>
  );
}
