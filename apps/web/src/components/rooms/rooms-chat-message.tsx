import { m } from '@orbs/i18n/client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { isFileUIPart } from 'ai';
import { Fragment, useState } from 'react';
import { defaultRemarkPlugins } from 'streamdown';
import { BotAvatar } from '@/components/bots/bot-avatar';
import { BotLeaderMark } from '@/components/bots/bot-leader-mark';
import { RoomsChatActions } from '@/components/rooms/rooms-chat-actions';
import { RoomsChatFiles } from '@/components/rooms/rooms-chat-files';
import { RoomsChatMention } from '@/components/rooms/rooms-chat-mention';
import { RoomsChatTools } from '@/components/rooms/rooms-chat-tools';
import { Message, MessageContent, MessageStack } from '@/components/ui/ai/message';
import { Response } from '@/components/ui/ai/response';
import { UserAvatar } from '@/components/users/user-avatar';
import { useLongPress } from '@/hooks/use-long-press';
import { mentionRemark } from '@/services/mention/mention.client';
import { MENTION_ALLOWED_TAGS } from '@/services/mention/mention.constants';
import { rpc } from '@/services/rpc/rpc.client';
import { toolBlocks } from '@/services/tool/tool.client';
import type { BotActivity } from '@/types/bot.types';
import type * as ClientTypes from '@orbs/server/client';
import type * as ReactTypes from 'react';

export function RoomsChatMessage({ message, trigger, room, name, user, bot, activity = 'idle', live = false, leader = false, reacting = false, onReply, onReact }: {
  message: ClientTypes.RoomUIMessage
  trigger?: ClientTypes.RoomUIMessage
  room?: ClientTypes.TenantRoomSummary
  name: string
  user?: ClientTypes.AuthSession['user']
  bot?: ClientTypes.Bot
  activity?: BotActivity
  live?: boolean
  leader?: boolean
  reacting?: boolean
  onReply?: () => void
  onReact?: (emoji: string) => void
}) {
  const reply = message.metadata?.replyTo;
  const [sheet, setSheet] = useState(false);
  const press = useLongPress(() => setSheet(true));
  const { data: bots } = useSuspenseQuery(rpc.bots.list.queryOptions());
  const blocks = toolBlocks({ parts: message.parts });
  const files = message.parts.filter(isFileUIPart);
  const firstText = blocks.find((block) => block.kind === 'text');
  const lastBlock = blocks.at(-1);
  const namedBlock = message.role === 'assistant' ? firstText ?? blocks.at(0) : undefined;
  const actionsBlock = blocks.filter((block) => block.kind === 'text').at(-1) ?? lastBlock;

  const actions = room ? (
    <RoomsChatActions
      message={message}
      reacting={reacting}
      room={room}
      sheet={sheet}
      trigger={trigger}
      onReact={onReact}
      onReply={onReply}
      onSheetChange={setSheet}
    />
  ) : null;

  const withActions = (content: ReactTypes.ReactNode) => (
    <div className="relative flex max-w-full items-center gap-2 group-data-[role=user]:flex-row-reverse">
      <div className="min-w-0">{content}</div>
      <div className="pointer-fine:absolute pointer-fine:top-1/2 pointer-fine:-translate-y-1/2 group-data-[role=assistant]:pointer-fine:left-full group-data-[role=assistant]:pointer-fine:ml-2 group-data-[role=user]:pointer-fine:right-full group-data-[role=user]:pointer-fine:mr-2">
        {actions}
      </div>
    </div>
  );

  const filesView = files.length > 0 ? <RoomsChatFiles files={files} /> : null;

  return (
    <Message from={message.role}>
      <MessageStack className={room ? 'pointer-coarse:select-none' : undefined} {...(room ? press : {})}>
        {filesView && !actionsBlock && actions ? withActions(filesView) : filesView}
        {blocks.map((block) => {
          const key = `${message.id}-${block.index}`;

          const content = block.kind === 'tools' ? (
            <RoomsChatTools
              bot={bot ?? { name }}
              className="-ml-10 w-auto max-w-none self-stretch"
              live={live}
              parts={block.parts}
            />
          ) : (
            <MessageContent tail={block === lastBlock}>
              {block === firstText && reply ? <span className="line-clamp-2 border-l-2 border-current/40 pl-2 text-xs opacity-80">{m.rooms_chat_reply_quote({ name: reply.authorName, text: reply.text })}</span> : null}
              {block.parts.map((part, index) => (
                <Response
                  allowedTags={MENTION_ALLOWED_TAGS}
                  components={{ mention: RoomsChatMention }}
                  key={`${key}-${index}`}
                  remarkPlugins={[...Object.values(defaultRemarkPlugins), mentionRemark({ bots })]}
                >
                  {part.text}
                </Response>
              ))}
            </MessageContent>
          );

          return (
            <Fragment key={key}>
              {block === namedBlock ? (
                <span className="flex items-center gap-1 px-4 text-xs font-medium text-muted-foreground">
                  {name}
                  {leader ? <BotLeaderMark /> : null}
                </span>
              ) : null}
              {block === actionsBlock && actions ? withActions(content) : content}
            </Fragment>
          );
        })}
      </MessageStack>
      {message.role === 'user' && user ? (
        <UserAvatar
          className="size-8 shrink-0 ring-1 ring-input"
          user={user}
        />
      ) : (
        <BotAvatar
          activity={activity}
          animate={live}
          bot={bot ?? { name }}
        />
      )}
    </Message>
  );
}
