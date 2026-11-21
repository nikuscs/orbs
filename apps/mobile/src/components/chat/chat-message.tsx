import { chatActivitySteps, chatActivityStepsLabel, mentionMarkdown, mentionTarget } from '@repo/client/client';
import { useChatHideVerbose } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { match } from 'ts-pattern';
import { EventLabel, EventLine, EventList } from '@/components/ui/event';
import { Markdown } from '@/components/ui/markdown';
import { Message, MessageBubble, MessageQuote } from '@/components/ui/message';
import { Text } from '@/components/ui/text';
import { chatMessageSegments } from '@/services/chat/chat.utils';
import { ChatArtifact } from './chat-artifact';
import { ChatEvents } from './chat-events';
import { ChatFailure } from './chat-failure';
import { ChatFiles } from './chat-files';
import { ChatGif } from './chat-gif';
import { ChatHtml } from './chat-html';
import { ChatNotice } from './chat-notice';
import { ChatReactions } from './chat-reactions';
import { ChatReasoning } from './chat-reasoning';
import { ChatSubagent } from './chat-subagent';
import { ChatTools } from './chat-tools';
import type { ChatMessagePart } from '@/types/chat.types';
import type { RpcSession } from '@/types/rpc.types';
import type { BotBubble, ChatMessage as ChatMessageItem, RoomsReactionGroup } from '@repo/client/client';
import type { Bot } from '@repo/contracts/universal';

interface ChatMessageProps {
  session: RpcSession;
  message: ChatMessageItem;
  bot: Bot;
  bots: Bot[];
  bubble?: BotBubble;
  isCollapsible?: boolean;
  day?: string;
  sentAt?: string;
  reactions: RoomsReactionGroup[];
  isLive: boolean;
  isSending: boolean;
  reacting?: boolean;
  reactionFailed?: boolean;
  onReact: (emoji: string) => void;
  onLongPress: () => void;
}

export function ChatMessage({
  session,
  message,
  bot,
  bots,
  bubble,
  isCollapsible = false,
  day,
  sentAt,
  reactions,
  isLive,
  isSending,
  reacting,
  reactionFailed,
  onReact,
  onLongPress,
}: ChatMessageProps) {
  const from = match(message.role).with('user', () => 'user' as const).otherwise(() => 'assistant' as const);
  const entryId = message.metadata?.entryId ?? 0;
  const canReact = from === 'assistant' && entryId > 0;
  const name = message.metadata?.authorName ?? bot.name;
  const router = useRouter();
  const { hideVerbose } = useChatHideVerbose();
  const [isExpanded, setIsExpanded] = useState(false);
  const steps = hideVerbose && !isLive ? chatActivitySteps(message) : null;
  const segments = chatMessageSegments(message, hideVerbose && !isExpanded);
  const reply = message.metadata?.replyTo;
  const firstText = segments.flatMap((segment) => (segment.kind === 'bubbles' ? segment.parts : [])).find((part) => part.kind === 'markdown');

  const dayLabel = day ? (
    <Text
      className="my-3"
      tone="muted"
      variant="message-time"
    >
      {day}
    </Text>
  ) : null;

  if (message.role === 'system') {
    return (
      <>
        {dayLabel}
        <ChatNotice bots={bots} message={message} />
      </>
    );
  }

  if (segments.length === 0) {
    return dayLabel;
  }

  function openLink(url: string) {
    const target = mentionTarget({ href: url });

    match(target)
      .with({ kind: 'bot' }, (peer) => router.push({ pathname: '/chat/[botId]', params: { botId: peer.name } }))
      .with({ kind: 'quote' }, () => undefined)
      .otherwise(() => void Linking.openURL(url));
  }

  function renderPart(part: ChatMessagePart) {
    return match(part)
      .with({ kind: 'markdown' }, (text) => (
        <MessageBubble
          bubble={bubble}
          from={from}
          key={text.key}
          readLessLabel={m.rooms_chat_read_less()}
          readMoreLabel={isCollapsible ? m.rooms_chat_read_more() : undefined}
        >
          {text === firstText && reply ? <MessageQuote>{m.rooms_chat_reply_quote({ name: reply.authorName, text: reply.text })}</MessageQuote> : null}
          <Markdown isStreaming={text.isStreaming} onLinkPress={openLink}>{mentionMarkdown({ text: text.text, bots })}</Markdown>
        </MessageBubble>
      ))
      .with({ kind: 'html' }, (html) => (
        <ChatHtml
          botId={bot.id}
          html={html.text}
          key={html.key}
        />
      ))
      .with({ kind: 'artifact' }, (artifact) => (
        <ChatArtifact
          artifact={artifact.artifact}
          key={artifact.key}
          session={session}
        />
      ))
      .with({ kind: 'gif' }, (gif) => <ChatGif gif={gif.gif} key={gif.key} />)
      .with({ kind: 'files' }, (files) => (
        <ChatFiles
          botId={bot.id}
          entryId={message.metadata?.entryIds[0]}
          files={files.files}
          key={files.key}
          session={session}
        />
      ))
      .exhaustive();
  }

  return (
    <>
      {dayLabel}
      {steps ? (
        <EventList>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
            onPress={() => setIsExpanded(!isExpanded)}
          >
            <EventLine>
              <EventLabel>{isExpanded ? m.rooms_activity_steps_hide() : chatActivityStepsLabel(steps)}</EventLabel>
            </EventLine>
          </Pressable>
        </EventList>
      ) : null}
      {segments.map((segment) => match(segment)
        .with({ kind: 'tools' }, (tools) => <ChatTools key={tools.key} parts={tools.parts} />)
        .with({ kind: 'events' }, (events) => (
          <ChatEvents
            bots={bots}
            events={events.events}
            key={events.key}
            senderId={bot.id}
            session={session}
          />
        ))
        .with({ kind: 'reasoning' }, (reasoning) => (
          <ChatReasoning
            bot={{ name, avatar: bot.avatar }}
            isStreaming={isLive ? reasoning.isStreaming : false}
            key={reasoning.key}
            text={reasoning.text}
          />
        ))
        .with({ kind: 'failure' }, (failure) => (
          <ChatFailure
            bot={bot}
            detail={failure.text}
            key={failure.key}
          />
        ))
        .with({ kind: 'subagent' }, (block) => (
          <ChatSubagent
            botId={bot.id}
            key={block.key}
            part={block.part}
            subagent={block.subagent}
          />
        ))
        .with({ kind: 'bubbles' }, (bubbles) => (
          <Message
            className={isSending ? 'opacity-60' : undefined}
            from={from}
            isGrouped={!bubbles.parts.some((part) => part.kind === 'files')}
            key={bubbles.key}
            onLongPress={isLive || isSending ? undefined : onLongPress}
          >
            {bubbles.parts.map(renderPart)}
          </Message>
        ))
        .exhaustive())}
      <ChatReactions
        align={from === 'user' ? 'end' : 'start'}
        disabled={reacting}
        failed={reactionFailed}
        groups={reactions}
        onToggle={canReact ? onReact : undefined}
      />
      {sentAt && !isLive && !isSending ? (
        <View className="items-center px-5 pb-1">
          <Text tone="muted" variant="caption">{sentAt}</Text>
        </View>
      ) : null}
    </>
  );
}
