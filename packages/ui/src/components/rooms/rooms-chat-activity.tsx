import { BOT_ACTIVITY_LABELS, chatActivityDetail, chatActivityPeer, toolRunning } from '@repo/client/client';
import { useChatElapsed, useChatHideVerbose } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { match } from 'ts-pattern';
import { cn } from '../../lib/cn';
import { messageSurface } from '../ai/message';
import { BotMention } from '../bots/bot-mention';
import type { ChatActivity, ChatActivityWait, ChatMessage } from '@repo/client/client';
import type { Bot } from '@repo/contracts/universal';

interface RoomsChatActivityProps {
  botName: string
  activity: ChatActivity
  bots: Bot[]
  draft?: ChatMessage
  startedAt?: number
  waitingOn?: ChatActivityWait
  waiting: boolean
}

export function RoomsChatActivity({ botName, activity, bots, draft, startedAt, waitingOn, waiting }: RoomsChatActivityProps) {
  const { hideVerbose } = useChatHideVerbose();
  const elapsed = useChatElapsed(startedAt, !waiting);
  const last = draft?.parts.filter((part) => part.type !== 'step-start').at(-1);
  const textSpeaks = activity === 'writing' && last?.type === 'text' && last.state === 'streaming';
  const toolRowSpeaks = !waiting && !waitingOn && !hideVerbose && last?.type === 'dynamic-tool' && toolRunning(last);
  const reasoningSpeaks = !waiting && !hideVerbose && last?.type === 'reasoning' && last.state === 'streaming';

  if (textSpeaks || toolRowSpeaks || reasoningSpeaks) {
    return null;
  }

  const detail = match(waitingOn)
    .with('approval', () => m.rooms_activity_waiting_approval())
    .with('question', () => m.rooms_activity_waiting_question())
    .otherwise(() => (waiting ? null : chatActivityDetail({ draft, bots })));

  const peer = waiting || waitingOn ? undefined : chatActivityPeer(draft, bots);
  const label = waiting ? m.rooms_chat_waiting({ bot: botName }) : detail ?? BOT_ACTIVITY_LABELS[activity]();

  return (
    <output aria-label={label} className="flex min-w-0 items-center gap-3">
      <span aria-hidden className={cn(messageSurface, 'flex h-7 items-center gap-1 rounded-full px-3')}>
        <span className="size-1.5 animate-typing-dot rounded-full bg-muted-foreground motion-reduce:animate-none" />
        <span className="size-1.5 animate-typing-dot-2 rounded-full bg-muted-foreground motion-reduce:animate-none" />
        <span className="size-1.5 animate-typing-dot-3 rounded-full bg-muted-foreground motion-reduce:animate-none" />
      </span>
      {peer ? (
        <span aria-hidden className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <span className="shimmer motion-reduce:shimmer-none">{m.rooms_activity_asking()}</span>
          <BotMention
            activity="working"
            animate
            bot={peer}
          />
        </span>
      ) : null}
      {peer || (activity === 'thinking' && !detail) ? null : <span aria-hidden className="line-clamp-2 min-w-0 shimmer text-sm text-muted-foreground motion-reduce:shimmer-none">{label}</span>}
      {elapsed === null ? null : <span aria-hidden className="shrink-0 text-xs text-muted-foreground/70 tabular-nums">{m.rooms_activity_elapsed({ seconds: elapsed })}</span>}
    </output>
  );
}
