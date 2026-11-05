import { botSkillName } from '@repo/client/client';
import { useChatQueue } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { ArrowUp, Box, ListOrdered, X } from 'lucide-react-native';
import { View } from 'react-native';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { PromptDrawerItem, PromptDrawerList } from '@/components/ui/prompt-drawer';
import { Text } from '@/components/ui/text';
import type { ChatQueued, ChatQueueParams } from '@repo/client/client';

interface ChatQueueProps {
  botId: string;
  botName: string;
  conversationId: number;
  queued: ChatQueued[];
  onOutgoingChange: ChatQueueParams['onOutgoingChange'];
}

export function ChatQueue({ botId, botName, conversationId, queued, onOutgoingChange }: ChatQueueProps) {
  const queue = useChatQueue({
    botId,
    conversationId,
    onOutgoingChange,
  });

  if (queued.length === 0) {
    return null;
  }

  return (
    <PromptDrawerList>
      {queued.map((item) => {
        const problem = queue.problem(item.submissionId);

        return (
          <PromptDrawerItem
            key={item.submissionId}
            leading={(
              <>
                <Icon
                  accessibilityLabel={m.rooms_chat_queue()}
                  icon={ListOrdered}
                  size="sm"
                  tone="muted"
                />
                {problem
                  ? null
                  : item.skills.map((name) => (
                    <Badge className="shrink-0 flex-row gap-1 px-1.5" key={name}>
                      <Icon icon={Box} size="sm" />
                      <Text numberOfLines={1}>{botSkillName({ name })}</Text>
                    </Badge>
                  ))}
              </>
            )}
            title={problem ?? item.text}
            tone={problem ? 'destructive' : 'default'}
            trailing={(
              <View className="flex-row items-center gap-1">
                <Button
                  accessibilityHint={m.rooms_chat_queue_send_hint({ bot: botName })}
                  accessibilityLabel={m.rooms_chat_queue_send()}
                  disabled={queue.isPending}
                  size="icon-xs"
                  variant="ghost"
                  onPress={() => queue.sendNow(item.submissionId)}
                >
                  <Icon icon={ArrowUp} size="sm" />
                </Button>
                <Button
                  accessibilityLabel={m.rooms_chat_queue_remove()}
                  disabled={queue.isPending}
                  size="icon-xs"
                  variant="ghost"
                  onPress={() => queue.remove(item.submissionId)}
                >
                  <Icon icon={X} size="sm" />
                </Button>
              </View>
            )}
          />
        );
      })}
    </PromptDrawerList>
  );
}
