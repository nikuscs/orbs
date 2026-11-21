import { botBubble, CHAT, chatActivityMessage, chatActivityStartedAt, chatPairMessages, roomsMessageDay, roomsMessageTime } from '@repo/client/client';
import { chatQueries, useChatPendingSync, useChatRoom } from '@repo/client/react';
import { getLocale, m } from '@repo/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { match, P } from 'ts-pattern';
import { MessageList } from '@/components/ui/message-list';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useConnection } from '@/hooks/use-connection';
import { CHAT_PANE } from '@/services/chat/chat.constants';
import { ChatMessage } from './chat-message';
import { ChatPairHeader } from './chat-pair-header';
import { ChatPaneClose } from './chat-pane';
import { ChatRuns } from './chat-runs';
import type { RpcSession } from '@/types/rpc.types';
import type { Bot, ConversationView } from '@repo/contracts/universal';

interface ChatPairProps {
  botId: string;
  peerId: string;
  conversationId: number;
}

export function ChatPair(props: ChatPairProps) {
  const { session } = useConnection();

  return match(session)
    .with(P.nonNullable, (current) => <ChatPairContent {...props} session={current} />)
    .otherwise(() => null);
}

interface ChatPairContentProps extends ChatPairProps {
  session: RpcSession;
}

function ChatPairContent({ session, botId, peerId, conversationId }: ChatPairContentProps) {
  const bots = useQuery(session.rpc.bots.list.queryOptions());
  const view = useQuery(chatQueries.view(session, { botId: peerId, conversationId }));

  return (
    <Screen padding="none" scroll={false}>
      {match({
        asker: bots.data?.find((item) => item.id === botId),
        peer: bots.data?.find((item) => item.id === peerId),
        view: view.data,
        isError: bots.isError || view.isError,
      })
        .with({
          asker: P.nonNullable,
          peer: P.nonNullable,
          view: P.nonNullable,
        }, (ready) => (
          <ChatPairView
            asker={ready.asker}
            bots={bots.data ?? []}
            peer={ready.peer}
            session={session}
            view={ready.view}
          />
        ))
        .otherwise(({ isError }) => (
          <View className="flex-1 items-center justify-center">
            <Text tone={isError ? 'destructive' : 'muted'}>{isError ? m.mobile_chat_error_title() : m.mobile_chat_loading()}</Text>
          </View>
        ))}
    </Screen>
  );
}

interface ChatPairViewProps {
  session: RpcSession;
  asker: Bot;
  peer: Bot;
  bots: Bot[];
  view: ConversationView;
}

function ChatPairView({ session, asker, peer, bots, view }: ChatPairViewProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = useSharedValue(insets.bottom + CHAT_PANE.barHeight);

  const room = useChatRoom({
    bot: peer,
    bots,
    view,
    outgoing: [],
  });

  const messages = chatPairMessages(room.messages, asker.id);
  const now = new Date();
  useChatPendingSync();

  return (
    <View className="flex-1">
      <MessageList
        composerInset={bottomInset}
        data={messages}
        footer={(
          <ChatRuns
            activity={room.activity}
            approvals={room.approvals}
            bot={peer}
            draft={chatActivityMessage(messages)}
            failure={room.failure}
            questions={room.questions}
            startedAt={chatActivityStartedAt(messages)}
          />
        )}
        keyExtractor={(message) => message.id}
        renderItem={(message) => {
          const index = messages.indexOf(message);

          return (
            <ChatMessage
              bot={peer}
              bots={bots}
              bubble={botBubble(peer)}
              day={roomsMessageDay({
                messages,
                index,
                now,
                locale: getLocale(),
              })}
              isCollapsible={index < messages.length - 1}
              isLive={message.id === CHAT.liveMessageId}
              isSending={false}
              message={message}
              reactions={[]}
              sentAt={message.metadata ? roomsMessageTime({ createdAt: message.metadata.createdAt, locale: getLocale() }) : undefined}
              session={session}
              onLongPress={() => undefined}
              onReact={() => undefined}
            />
          );
        }}
        onStartReached={() => {
          if (room.older.isEnabled && !room.older.isLoading) {
            room.older.onLoad();
          }
        }}
      />
      <ChatPairHeader asker={asker} peer={peer} />
      <ChatPaneClose label={m.rooms_pair_close()} />
    </View>
  );
}
