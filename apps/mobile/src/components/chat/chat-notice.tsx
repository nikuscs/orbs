import { roomsMessageText } from '@repo/client/client';
import { m } from '@repo/i18n/client';
import { AlarmClock, Workflow } from 'lucide-react-native';
import { match, P } from 'ts-pattern';
import { BotMention } from '@/components/bots/bot-mention';
import { Event, EventBody, EventContent, EventLabel, EventLine, EventList, EventName, EventTrigger } from '@/components/ui/event';
import { Icon } from '@/components/ui/icon';
import { Markdown } from '@/components/ui/markdown';
import type { EventStatus } from '@/components/ui/event';
import type { ChatMessage, ChatPart } from '@repo/client/client';
import type { Bot } from '@repo/contracts/universal';
import type { ReactNode } from 'react';

interface ChatNoticeLine {
  label: string;
  name?: ReactNode;
  status?: EventStatus;
}

interface ChatNoticeProps {
  message: ChatMessage;
  bots: Bot[];
}

export function ChatNotice({ message, bots }: ChatNoticeProps) {
  const text = roomsMessageText(message);

  const line = match<ChatPart | undefined, ChatNoticeLine>(message.parts[0])
    .with({ type: 'data-subagent' }, ({ data }) => ({
      label: data.status === 'answered' ? m.rooms_event_subagent_answered() : m.rooms_event_subagent_failed(),
      name: <EventName icon={<Icon icon={Workflow} tone="subtle" />}>{data.name}</EventName>,
      status: data.status === 'answered' ? undefined : 'error',
    }))
    .with({ type: 'data-ownerNote', data: { peerName: P.string.minLength(1) } }, ({ data }) => ({
      label: m.rooms_event_owner_note(),
      name: <BotMention bot={bots.find((item) => item.id === data.peerBotId) ?? { name: data.peerName }} />,
    }))
    .with({ type: 'data-ownerNote' }, () => ({ label: m.rooms_notice_owner_note_unknown() }))
    .with({ type: 'data-routineRun', data: { name: P.string.minLength(1) } }, ({ data }) => ({
      label: m.rooms_event_routine_run(),
      name: <EventName icon={<Icon icon={AlarmClock} tone="subtle" />}>{data.name}</EventName>,
    }))
    .with({ type: 'data-routineRun' }, () => ({ label: m.rooms_notice_routine_run_unnamed() }))
    .with({ type: 'data-botStart' }, () => ({ label: m.rooms_event_bot_start() }))
    .with({ type: 'data-compaction' }, () => ({ label: m.rooms_notice_compacted() }))
    .with({ type: 'data-reset' }, () => ({ label: m.rooms_notice_reset() }))
    .otherwise(() => ({ label: message.metadata?.authorName ?? '' }));

  const content = (
    <>
      <EventLabel>{line.label}</EventLabel>
      {line.name}
    </>
  );

  return (
    <EventList className="my-1">
      {text ? (
        <Event>
          <EventTrigger status={line.status}>{content}</EventTrigger>
          <EventContent>
            <EventBody>
              <Markdown tone="muted">{text}</Markdown>
            </EventBody>
          </EventContent>
        </Event>
      ) : <EventLine status={line.status}>{content}</EventLine>}
    </EventList>
  );
}
