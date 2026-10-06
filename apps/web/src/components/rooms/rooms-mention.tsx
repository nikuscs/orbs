import { m } from '@orbs/i18n/client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { BotAvatar } from '@/components/bots/bot-avatar';
import { Mention } from '@/components/ui/mention';
import { botSkillName } from '@/services/bot/bot.client';
import { rpc } from '@/services/rpc/rpc.client';
import { roomMentionTarget } from '@orbs/server/client';
import IconBox from '~icons/lucide/box';
import IconHash from '~icons/lucide/hash';
import IconUsers from '~icons/lucide/users';

export function RoomsMention({ href, label }: { href: string; label: string }) {
  const { data: bots } = useSuspenseQuery(rpc.bots.list.queryOptions());
  const { data: rooms } = useSuspenseQuery(rpc.rooms.list.queryOptions());
  const target = roomMentionTarget(href);
  const room = target?.kind === 'room' ? rooms.find((candidate) => candidate.id === target.id) : undefined;

  if (room) {
    return (
      <Mention title={label} variant="outline-soft">
        <IconHash className="size-4 p-0.5" />
        {room.name}
      </Mention>
    );
  }

  if (target?.kind === 'skill') {
    return (
      <Mention title={label} variant="skill">
        <IconBox className="size-3.5 p-0.5" />
        {botSkillName({ name: target.id })}
      </Mention>
    );
  }

  if (target?.kind === 'everyone') {
    return (
      <Mention title={label} variant="outline-soft">
        <IconUsers className="size-4 p-0.5" />
        {m.rooms_mention_everyone()}
      </Mention>
    );
  }

  const bot = target?.kind === 'bot' ? bots.find((candidate) => candidate.id === target.id) : undefined;

  if (!bot) {
    return <Mention variant="muted">{label}</Mention>;
  }

  return (
    <Mention title={`@${bot.handle}`} variant="outline-soft">
      <BotAvatar
        animate={false}
        bot={bot}
        size={16}
      />
      {bot.name}
    </Mention>
  );
}
