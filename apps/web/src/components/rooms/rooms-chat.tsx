import { useChat } from '@ai-sdk/react';
import { m } from '@orbs/i18n/client';
import { useMessageScroller } from '@shadcn/react/message-scroller';
import { keepPreviousData, useQueries, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useMatch, useNavigate } from '@tanstack/react-router';
import { lazy, useEffect, useRef, useState } from 'react';
import { match } from 'ts-pattern';
import { RoomsChatAttachments } from '@/components/rooms/rooms-chat-attachments';
import { RoomsChatOlder } from '@/components/rooms/rooms-chat-older';
import { RoomsChatPill } from '@/components/rooms/rooms-chat-pill';
import { RoomsChatReply } from '@/components/rooms/rooms-chat-reply';
import { RoomsChatRuns } from '@/components/rooms/rooms-chat-runs';
import { RoomsMention } from '@/components/rooms/rooms-mention';
import { RoomsMentionOption } from '@/components/rooms/rooms-mention-option';
import { PromptInput, PromptInputActionMenu, PromptInputActionMenuContent, PromptInputActionMenuItem, PromptInputActionMenuTrigger, PromptInputDrawer, PromptInputQuote, PromptInputSubmit } from '@/components/ui/ai/prompt-input';
import { InputGroupAddon } from '@/components/ui/input-group';
import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerViewport } from '@/components/ui/message-scroller';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useRoomAttachments } from '@/hooks/use-room-attachments';
import { botRoomActivities } from '@/services/bot/bot.client';
import { roomsBlindBots } from '@/services/rooms/rooms.client';
import { rpc } from '@/services/rpc/rpc.client';
import { tenantService } from '@/services/tenant/tenant.client';
import { tenantFreshAnchors, tenantMergeOlder, tenantMergeTimeline, tenantMessageText } from '@/services/tenant/tenant.utils';
import { ROOM, roomMentionHref, STORAGE } from '@orbs/server/client';
import IconPaperclip from '~icons/lucide/paperclip';
import type { Bot, RoomUIMessage } from '@orbs/server/client';

const RoomsChatMessage = lazy(() => import('@/components/rooms/rooms-chat-message').then((module) => ({ default: module.RoomsChatMessage })));
const PromptInputEditor = lazy(() => import('@/components/ui/ai/prompt-input-editor').then((module) => ({ default: module.PromptInputEditor })));

export function RoomsChat({ roomId, bots }: { roomId: string; bots: Bot[] }) {
  const queryClient = useQueryClient();
  const { context } = useMatch({ from: '__root__' });
  const navigate = useNavigate();
  const scroller = useMessageScroller();
  const isMobile = useIsMobile();
  const { data: timeline } = useSuspenseQuery(rpc.rooms.timeline.queryOptions({ input: { roomId } }));
  const { data: rooms } = useSuspenseQuery(rpc.rooms.list.queryOptions());
  const chat = tenantService.roomChat(roomId, timeline.messages);
  const { messages, sendMessage, setMessages, status, error } = useChat({ chat });
  const files = useRoomAttachments(roomId);
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [skillsRequested, setSkillsRequested] = useState(false);
  const [replyTo, setReplyTo] = useState<RoomUIMessage | null>(null);
  const busy = timeline.runs.some((run) => run.status === 'queued' || run.status === 'running');
  const botsById = new Map(bots.map((bot) => [bot.id, bot]));
  const messagesById = new Map(messages.map((message) => [message.id, message]));
  const activities = botRoomActivities({ runs: timeline.runs });
  const members = bots.filter((bot) => timeline.room.botIds.includes(bot.id));
  const noMembers = members.length === 0;
  const missingDaemonIsFinal = { retry: false } as const;

  const skills = useQueries({
    queries: members.map((bot) => ({
      ...rpc.bots.skills.queryOptions({ input: { botId: bot.id } }),
      ...missingDaemonIsFinal,
      enabled: skillsRequested,
    })),
  });

  const skillOptions = members
    .flatMap((bot, index) => (skills[index]?.data ?? []).map((skill) => ({ ...skill, bot })))
    .filter((option, index, all) => all.findIndex((other) => other.name === option.name) === index);

  const skillsEmpty = match(skills)
    .when((results) => results.some((result) => result.isPending), () => m.rooms_mention_skills_loading())
    .when((results) => results.some((result) => result.isError), () => m.rooms_mention_skills_offline())
    .otherwise(() => m.rooms_mention_skills_empty());

  const stopping = busy && (noMembers || (!text.trim() && files.attachments.length === 0));
  const compacting = timeline.runs.some((run) => run.status === 'running' && run.activity === 'compacting');
  const firstMessageSeq = 1;
  const oldestLoadedSeq = messages[0]?.metadata?.seq ?? firstMessageSeq;
  const olderPagesRemain = oldestLoadedSeq > firstMessageSeq;

  const { data: reactions = {} } = useQuery({
    ...rpc.rooms.reactions.queryOptions({ input: { roomId, fromSeq: oldestLoadedSeq } }),
    placeholderData: keepPreviousData,
  });

  const freshAnchors = tenantFreshAnchors({ messages, fresh: timeline.room.fresh });

  useEffect(() => tenantService.subscribe((event) => {
    if (event.type === 'room.deleted' && event.roomId === roomId) {
      void navigate({ to: '/rooms' });
    }
  }), [navigate, roomId]);

  useEffect(() => {
    const sendSettled = status === 'ready';

    if (sendSettled) {
      setMessages((current) => tenantMergeTimeline({ current, latest: timeline.messages }));
    }
  }, [setMessages, status, timeline.messages]);

  useEffect(() => () => {
    setMessages((current) => current.slice(-ROOM.timelineLimit));
    queryClient.setQueryData(
      rpc.rooms.timeline.queryKey({ input: { roomId } }),
      (cached) => (cached ? { ...cached, messages: cached.messages.slice(-ROOM.timelineLimit) } : cached),
    );
  }, [queryClient, roomId, setMessages]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-12 pt-3 *:pointer-events-auto">
        <RoomsChatPill
          activities={activities}
          members={members}
          room={timeline.room}
        />
      </div>
      <MessageScroller className="flex-1">
        <MessageScrollerViewport
          aria-label={m.rooms_chat_transcript()}
          className="scroll-fade-b-2 scroll-fade-t-10"
          fade="both"
        >
          <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-0 p-4 pt-16">
            {messages[0] ? (
              <MessageScrollerItem>
                <RoomsChatOlder
                  before={olderPagesRemain ? messages[0].id : null}
                  roomId={roomId}
                  onLoaded={(older) => setMessages((current) => tenantMergeOlder({ older, current }))}
                />
              </MessageScrollerItem>
            ) : null}
            {messages.map((message) => (
              <MessageScrollerItem key={message.id} messageId={message.id}>
                {message.role === 'assistant' && message.metadata ? (
                  <RoomsChatReply
                    bot={botsById.get(message.metadata.authorId)}
                    groups={reactions[message.id] ?? []}
                    leader={message.metadata.authorId === timeline.room.leaderBotId}
                    message={message}
                    name={message.metadata.authorName}
                    room={timeline.room}
                    roomId={roomId}
                    trigger={messagesById.get(message.metadata.triggerId ?? '')}
                    onReply={() => setReplyTo(message)}
                  />
                ) : (
                  <RoomsChatMessage
                    bot={botsById.get(message.metadata?.authorId ?? '')}
                    message={message}
                    name={message.metadata?.authorName ?? ''}
                    room={timeline.room}
                    user={context.user ?? undefined}
                    onReply={message.metadata ? () => setReplyTo(message) : undefined}
                  />
                )}
                {freshAnchors.has(message.id) ? (
                  <p className="my-2 text-center text-xxs text-muted-foreground">
                    {m.rooms_fresh_divider({ bots: (freshAnchors.get(message.id) ?? []).map((botId) => botsById.get(botId)?.name ?? '').join(', ') })}
                  </p>
                ) : null}
              </MessageScrollerItem>
            ))}
            <RoomsChatRuns
              bots={bots}
              key={roomId}
              leaderBotId={timeline.room.leaderBotId}
              roomId={roomId}
              runs={timeline.runs}
            />
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
      <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4">
        <PromptInput
          key={roomId}
          onDragOver={files.onDragOver}
          onDrop={files.onDrop}
          onPaste={files.onPaste}
          onSubmit={async ({ text: value }) => {
            if (compacting || files.uploading) {
              return false;
            }

            if (noMembers || (!value.trim() && files.readyIds.length === 0)) {
              if (busy) {
                void rpc.rooms.stop.call({ roomId });
              }

              return false;
            }

            const parts = files.readyParts;
            const body = { replyToMessageId: replyTo?.id, fileIds: files.readyIds };

            scroller.scrollToEnd({ behavior: 'smooth' });
            await sendMessage(value.trim() ? { text: value, files: parts } : { files: parts }, { body });

            if (chat.status === 'error') {
              setMessages((current) => tenantMergeTimeline({ current, latest: timeline.messages }));
              return false;
            }

            files.clear(body.fileIds);
            setReplyTo((current) => current?.id === body.replyToMessageId ? null : current);

            return true;
          }}
        >
          {noMembers ? (
            <PromptInputDrawer variant="destructive">
              <output className="block px-2 py-1.5 text-xs">
                <Link params={{ roomId }} to="/rooms/$roomId/settings">{m.rooms_chat_no_members()}</Link>
              </output>
            </PromptInputDrawer>
          ) : null}
          {noMembers ? null : <RoomsChatAttachments blindBots={roomsBlindBots({ error })} files={files} />}
          {!noMembers && replyTo ? (
            <PromptInputQuote removeLabel={m.rooms_chat_reply_clear()} onRemove={() => setReplyTo(null)}>
              {m.rooms_chat_replying({ name: replyTo.metadata?.authorName ?? '', text: tenantMessageText(replyTo) })}
            </PromptInputQuote>
          ) : null}
          <InputGroupAddon align="inline-start">
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger
                aria-label={m.rooms_chat_attach()}
                disabled={noMembers}
                title={m.rooms_chat_attach()}
                variant="secondary"
              />
              <PromptInputActionMenuContent>
                <PromptInputActionMenuItem disabled={files.attachments.length >= STORAGE.maxFilesPerMessage} onSelect={() => fileInput.current?.click()}>
                  <IconPaperclip />
                  {m.rooms_chat_attach()}
                </PromptInputActionMenuItem>
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
            <input
              hidden
              multiple
              accept={[...STORAGE.imageTypes, ...STORAGE.documentTypes].join(',')}
              ref={fileInput}
              type="file"
              onChange={(event) => {
                files.add([...(event.currentTarget.files ?? [])]);
                event.currentTarget.value = '';
              }}
            />
          </InputGroupAddon>
          <PromptInputEditor
            aria-label={m.rooms_chat_placeholder()}
            disabled={compacting || noMembers}
            focusOnMount={!isMobile}
            placeholder={compacting ? m.rooms_chat_compacting_wait() : m.rooms_chat_placeholder()}
            renderItem={(item) => (
              <RoomsMentionOption
                href={item.href}
                label={item.label}
                skills={skillOptions}
              />
            )}
            renderMention={(item) => <RoomsMention href={item.href} label={item.label} />}
            triggers={[
              {
                char: '@',
                empty: m.rooms_mention_empty(),
                items: (query) => [
                  ...members.map((bot) => ({ href: roomMentionHref({ kind: 'bot', id: bot.id }), label: `@${bot.handle}`, name: bot.name })),
                  ...(timeline.room.kind === 'group' ? ['everyone', 'here'].map((handle) => ({ href: roomMentionHref({ kind: 'everyone', id: handle }), label: `@${handle}`, name: m.rooms_mention_everyone() })) : []),
                ]
                  .filter((item) => `${item.name} ${item.label}`.toLowerCase().includes(query.toLowerCase()))
                  .map(({ href, label }) => ({ href, label })),
              },
              {
                char: '#',
                empty: m.rooms_mention_rooms_empty(),
                items: (query) => rooms
                  .filter((room) => room.kind === 'group' && room.id !== roomId && room.name.toLowerCase().includes(query.toLowerCase()))
                  .map((room) => ({ href: roomMentionHref({ kind: 'room', id: room.id }), label: `#${room.name}` })),
              },
              {
                char: '$',
                empty: skillsEmpty,
                items: async (query) => {
                  setSkillsRequested(true);

                  const available = await Promise.all(members.map((bot) => queryClient.fetchQuery({
                    ...rpc.bots.skills.queryOptions({ input: { botId: bot.id } }),
                    retry: false,
                  }).catch(() => [])));

                  return available
                    .flat()
                    .filter((skill, index, all) => all.findIndex((other) => other.name === skill.name) === index)
                    .filter((skill) => `${skill.name} ${skill.description}`.toLowerCase().includes(query.toLowerCase()))
                    .map((skill) => ({ href: roomMentionHref({ kind: 'skill', id: skill.name }), label: `$${skill.name}` }));
                },
              },
            ]}
            onTextChange={setText}
          />
          <InputGroupAddon align="inline-end">
            <PromptInputSubmit
              aria-label={stopping ? m.rooms_chat_stop() : m.rooms_chat_send()}
              disabled={compacting || files.uploading || (!busy && (noMembers || (!text.trim() && files.readyIds.length === 0)))}
              status={stopping ? 'streaming' : status}
              title={stopping ? m.rooms_chat_stop() : m.rooms_chat_send()}
            />
          </InputGroupAddon>
        </PromptInput>
      </div>
    </div>
  );
}
