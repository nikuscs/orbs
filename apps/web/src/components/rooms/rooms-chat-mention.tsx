import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { RoomsMention } from '@/components/rooms/rooms-mention';
import { RoomsMentionCard } from '@/components/rooms/rooms-mention-card';
import { rpc } from '@/services/rpc/rpc.client';
import { roomMentionElement, roomMentionTarget } from '@orbs/server/client';
import type { HTMLAttributes } from 'react';
import type { ExtraProps } from 'streamdown';

interface RoomsChatMentionProps extends HTMLAttributes<HTMLElement>, ExtraProps {}

export function RoomsChatMention(props: RoomsChatMentionProps) {
  const { data: rooms } = useSuspenseQuery(rpc.rooms.list.queryOptions());
  const { data: bots } = useSuspenseQuery(rpc.bots.list.queryOptions());
  const parsed = roomMentionElement.safeParse(props);

  if (!parsed.success) {
    return null;
  }

  const href = parsed.data['data-href'];
  const target = roomMentionTarget(href);
  const pill = <RoomsMention href={href} label={parsed.data['data-label']} />;
  const bot = target?.kind === 'bot' ? bots.find((candidate) => candidate.id === target.id) : undefined;

  if (bot) {
    return <RoomsMentionCard bot={bot}>{pill}</RoomsMentionCard>;
  }

  return target?.kind === 'room' && rooms.some((room) => room.id === target.id) ? <Link params={{ roomId: target.id }} to="/rooms/$roomId">{pill}</Link> : pill;
}
