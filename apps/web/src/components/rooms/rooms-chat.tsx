import { CHAT, mentionQuote } from '@repo/client/client';
import { chatQueries, useChatRoom } from '@repo/client/react';
import { useChatQuote, useChatRead } from '@repo/client/web';
import { cn } from '@repo/ui/cn';
import { LAYOUT_SHORTCUT_OPTIONS, LAYOUT_SHORTCUT_OVERLAYS, LAYOUT_SHORTCUTS } from '@repo/ui/layout.constants';
import { PaneHost, usePaneHost } from '@repo/ui/pane';
import { RoomsChatPill } from '@repo/ui/rooms/rooms-chat-pill';
import { RoomsChatQuote } from '@repo/ui/rooms/rooms-chat-quote';
import { RoomsChatRuns } from '@repo/ui/rooms/rooms-chat-runs';
import { RoomsChatStatus } from '@repo/ui/rooms/rooms-chat-status';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { RoomsChatAround } from '@/components/rooms/rooms-chat-around';
import { RoomsChatComposer } from '@/components/rooms/rooms-chat-composer';
import { RoomsChatTranscript } from '@/components/rooms/rooms-chat-transcript';
import { rpc } from '@/services/rpc/rpc.client';
import { RPC_CONTEXT } from '@/services/rpc/rpc.constants';
import type { ChatMessage, ChatOutgoing, RoomsChat as RoomsChatItem } from '@repo/client/client';
import type { Bot, ConversationView } from '@repo/contracts/universal';
import type { PromptInputEditorHandle } from '@repo/ui/ai/prompt-input-editor';

interface RoomsChatViewProps {
  bot: Bot
  bots: Bot[]
  chat: RoomsChatItem
  view: ConversationView
}

function RoomsChatView({ bot, bots, chat, view }: RoomsChatViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message: focusEntryId } = useSearch({ from: '/_chat' });
  const composer = useRef<PromptInputEditorHandle>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [outgoing, setOutgoing] = useState<ChatOutgoing[]>([]);
  const quote = useChatQuote();
  const [composerHeight, setComposerHeight] = useState(0);
  const panes = usePaneHost();
  const { conversationId } = view;

  const room = useChatRoom({
    bot,
    bots,
    view,
    outgoing,
    isMain: true,
  });

  const { messages, activity, queued, isBusy } = room;
  const unread = useChatRead(bot.id, chat.readThroughEntryId, view.latestEntryId, panes.isOpen);
  const draft = messages.find((message) => message.id === CHAT.liveMessageId);
  const unreadReply = messages.filter((message) => message.role === 'assistant' && (message.metadata?.entryId ?? 0) > chat.readThroughEntryId).at(-1);
  const around = focusEntryId !== undefined && !messages.some((message) => message.metadata?.entryIds.includes(focusEntryId)) ? focusEntryId : undefined;

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: rpc.artifacts.key({ input: { botId: bot.id } }) });
  }, [bot.id, queryClient, view.artifactsRevision]);

  function quoteSelection() {
    const entryId = messages.find((message) => message.id === quote.selection?.messageId)?.metadata?.entryId;

    if (!quote.selection || entryId === undefined) {
      return;
    }

    composer.current?.insert([mentionQuote({ text: quote.selection.text, entryId })]);
    document.getSelection()?.removeAllRanges();
    quote.dismiss();
  }

  function reply(message: ChatMessage) {
    setReplyTo(message);
    composer.current?.focus();
  }

  function send() {
    panes.closeAll();

    if (focusEntryId) {
      leaveFocus();
    }
  }

  function leaveFocus() {
    void navigate({
      to: '.',
      search: (previous) => ({ ...previous, message: undefined }),
      replace: true,
    });
  }

  useHotkeys(LAYOUT_SHORTCUTS.stop, () => void rpc.conversation.stop.call({ botId: bot.id, conversationId }), {
    ...LAYOUT_SHORTCUT_OPTIONS,
    enabled: isBusy,
    ignoreEventWhen: () => Boolean(document.querySelector(LAYOUT_SHORTCUT_OVERLAYS)),
  });

  const measureComposer = (node: HTMLDivElement | null) => {
    if (!node) {
      return;
    }

    const observer = new ResizeObserver(() => setComposerHeight(node.offsetHeight));
    observer.observe(node);

    return () => observer.disconnect();
  };

  return (
    <PaneHost
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      host={panes}
      insetBottom={composerHeight}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-12 items-center justify-center px-14 *:pointer-events-auto max-md:bg-background/80 max-md:backdrop-blur-md md:h-auto md:pt-3">
        <RoomsChatPill activity={activity} bot={bot} />
      </div>
      {around ? (
        <RoomsChatAround
          bot={bot}
          bots={bots}
          composerHeight={composerHeight}
          entryId={around}
          key={around}
          view={view}
          onLatest={leaveFocus}
          onReply={reply}
        />
      ) : (
        <RoomsChatTranscript
          bot={bot}
          bots={bots}
          composerHeight={composerHeight}
          focusedEntryId={focusEntryId}
          footer={(
            <RoomsChatRuns
              activity={activity}
              approvals={room.approvals}
              bot={bot}
              bots={bots}
              draft={draft}
              failure={room.failure}
              questions={room.questions}
            />
          )}
          messages={[...messages, ...room.sending]}
          older={room.older}
          reactions={room.reactions}
          unread={chat.hasUnread || unread.throughEntryId < view.latestEntryId ? unread : undefined}
          onReply={reply}
        />
      )}
      {quote.selection ? (
        <RoomsChatQuote
          rect={quote.selection.rect}
          onDismiss={quote.dismiss}
          onQuote={quoteSelection}
        />
      ) : null}
      <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 *:pointer-events-auto', panes.isOpen ? 'z-30' : 'z-10')} ref={measureComposer}>
        <RoomsChatComposer
          bot={bot}
          bots={bots}
          compaction={room.compaction}
          conversationId={conversationId}
          editor={composer}
          isBusy={isBusy}
          latestEntryId={view.latestEntryId}
          messages={messages}
          queued={queued}
          replyTo={replyTo}
          status={panes.isOpen ? (
            <RoomsChatStatus
              activity={activity}
              bot={bot}
              draft={draft}
              unread={unreadReply}
              onOpen={panes.closeAll}
            />
          ) : undefined}
          onOutgoingChange={setOutgoing}
          onReplyChange={setReplyTo}
          onSend={send}
        />
      </div>
    </PaneHost>
  );
}

interface RoomsChatProps {
  bot: Bot
  bots: Bot[]
  chat: RoomsChatItem
}

export function RoomsChat({ bot, bots, chat }: RoomsChatProps) {
  const { data: view } = useQuery(chatQueries.view(RPC_CONTEXT, { botId: bot.id }));

  return view ? (
    <RoomsChatView
      bot={bot}
      bots={bots}
      chat={chat}
      view={view}
    />
  ) : null;
}
