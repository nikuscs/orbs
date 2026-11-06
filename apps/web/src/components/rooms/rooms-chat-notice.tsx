import { roomsMessageText } from '@repo/client/client';
import { m } from '@repo/i18n/client';
import { Event, EventBody, EventContent, EventLabel, EventLine, EventList, EventName, EventTrigger } from '@repo/ui/ai/event';
import { Response } from '@repo/ui/ai/response';
import { BotMention } from '@repo/ui/bots/bot-mention';
import { useSuspenseQuery } from '@tanstack/react-query';
import { match, P } from 'ts-pattern';
import { rpc } from '@/services/rpc/rpc.client';
import IconLucideAlarmClock from '~icons/lucide/alarm-clock';
import IconLucideWorkflow from '~icons/lucide/workflow';
import type { ChatMessage, ChatPart } from '@repo/client/client';
import type { EventStatus } from '@repo/ui/ai/event';
import type { ReactNode } from 'react';

interface RoomsChatNoticeLine {
  label: string
  name?: ReactNode
  status?: EventStatus
}

interface RoomsChatNoticeProps {
  message: ChatMessage
}

export function RoomsChatNotice({ message }: RoomsChatNoticeProps) {
  const { data: bots } = useSuspenseQuery(rpc.bots.list.queryOptions());
  const text = roomsMessageText(message);

  const line = match<ChatPart | undefined, RoomsChatNoticeLine>(message.parts[0])
    .with({ type: 'data-subagent' }, ({ data }) => ({
      label: data.status === 'answered' ? m.rooms_event_subagent_answered() : m.rooms_event_subagent_failed(),
      name: <EventName icon={<IconLucideWorkflow />}>{data.name}</EventName>,
      status: data.status === 'answered' ? undefined : 'error',
    }))
    .with({ type: 'data-ownerNote', data: { peerName: P.string.minLength(1) } }, ({ data }) => {
      const peer = bots.find((item) => item.id === data.peerBotId);

      return { label: m.rooms_event_owner_note(), name: <BotMention bot={peer ?? { name: data.peerName }} /> };
    })
    .with({ type: 'data-ownerNote' }, () => ({ label: m.rooms_notice_owner_note_unknown() }))
    .with({ type: 'data-routineRun', data: { name: P.string.minLength(1) } }, ({ data }) => ({
      label: m.rooms_event_routine_run(),
      name: <EventName icon={<IconLucideAlarmClock />}>{data.name}</EventName>,
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
    <EventList data-message-id={message.id}>
      {text ? (
        <Event>
          <EventTrigger status={line.status}>{content}</EventTrigger>
          <EventContent>
            <EventBody variant="markdown">
              <Response>{text}</Response>
            </EventBody>
          </EventContent>
        </Event>
      ) : <EventLine status={line.status}>{content}</EventLine>}
    </EventList>
  );
}
