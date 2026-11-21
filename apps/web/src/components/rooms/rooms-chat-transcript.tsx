import { CHAT, roomsMessageDay, roomsMessageTime, roomsReactionGroups } from '@repo/client/client';
import { m } from '@repo/i18n/client';
import { getLocale } from '@repo/i18n/runtime';
import { botBubbleStyle } from '@repo/ui/bot.client';
import { MessageScroller, MessageScrollerButton, MessageScrollerViewport } from '@repo/ui/message-scroller';
import { RoomsChatHistory } from '@repo/ui/rooms/rooms-chat-history';
import { RoomsChatUnread } from '@repo/ui/rooms/rooms-chat-unread';
import { RoomsChatTranscriptItem } from '@/components/rooms/rooms-chat-transcript-item';
import type { ChatMessage, RoomsHistoryLoader, RoomsUnread } from '@repo/client/client';
import type { Bot, ConversationReaction } from '@repo/contracts/universal';
import type { MessageScrollerRow } from '@repo/ui/message-scroller';
import type { ReactNode } from 'react';

interface RoomsChatTranscriptProps {
  bot: Bot
  bots: Bot[]
  messages: ChatMessage[]
  reactions: Map<number, ConversationReaction>
  focusedEntryId: number | undefined
  unread?: RoomsUnread
  older: RoomsHistoryLoader
  newer?: RoomsHistoryLoader
  footer?: ReactNode
  isReadOnly?: boolean
  composerHeight?: number
  onReply: (message: ChatMessage) => void
}

export function RoomsChatTranscript({
  bot,
  bots,
  messages,
  reactions,
  focusedEntryId,
  unread,
  older,
  newer,
  footer,
  isReadOnly = false,
  composerHeight = 0,
  onReply,
}: RoomsChatTranscriptProps) {
  const now = new Date();
  const focusedId = focusedEntryId === undefined ? undefined : messages.find((message) => message.metadata?.entryIds.includes(focusedEntryId))?.id;
  const firstUnreadId = unread ? messages.find((message) => message.role !== 'user' && (message.metadata?.entryId ?? 0) > unread.throughEntryId)?.id : undefined;

  const rows: MessageScrollerRow[] = [
    ...messages.map((message, index) => ({
      key: message.id,
      node: (
        <>
          {unread && message.id === firstUnreadId ? <RoomsChatUnread seen={unread.isSeen} onSeen={unread.onSeen} /> : null}
          <RoomsChatTranscriptItem
            bot={bot}
            day={roomsMessageDay({
              messages,
              index,
              now,
              locale: getLocale(),
            })}
            groups={isReadOnly ? [] : roomsReactionGroups({ reaction: reactions.get(message.metadata?.entryId ?? 0), bots })}
            isCollapsible={index < messages.length - 1}
            isFocused={message.id === focusedId}
            isLive={message.id === CHAT.liveMessageId}
            isReadOnly={isReadOnly}
            isSending={message.id.startsWith(CHAT.outgoingPrefix)}
            message={message}
            sentAt={message.metadata
              ? {
                iso: new Date(message.metadata.createdAt).toISOString(),
                label: roomsMessageTime({ createdAt: message.metadata.createdAt, locale: getLocale() }),
              }
              : undefined}
            onReply={onReply}
          />
        </>
      ),
    })),
    newer
      ? { key: 'history-newer', node: <RoomsChatHistory direction="newer" {...newer} /> }
      : { key: 'runs', node: footer },
  ];

  return (
    <MessageScroller className="flex-1" style={botBubbleStyle(bot)}>
      <MessageScrollerViewport
        aria-label={m.rooms_chat_transcript()}
        endInset={composerHeight}
        fade="both"
        focusKey={focusedId}
        header={messages.length > 0 ? <RoomsChatHistory direction="older" {...older} /> : null}
        positionKey={bot.id}
        rowClassName="max-w-3xl"
        rows={rows}
      />
      <MessageScrollerButton style={composerHeight ? { bottom: composerHeight + 16 } : undefined} />
    </MessageScroller>
  );
}
