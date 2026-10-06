import { m } from '@orbs/i18n/client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { BotAvatar } from '@/components/bots/bot-avatar';
import { Badge } from '@/components/ui/badge';
import { botSkillName } from '@/services/bot/bot.client';
import { rpc } from '@/services/rpc/rpc.client';
import { roomMentionTarget } from '@orbs/server/client';
import IconBox from '~icons/lucide/box';
import IconHash from '~icons/lucide/hash';
import IconLibrary from '~icons/lucide/library';
import IconUsers from '~icons/lucide/users';
import type { Bot, DaemonSkill } from '@orbs/server/client';

export function RoomsMentionOption({ href, label, skills }: { href: string; label: string; skills: (DaemonSkill & { bot: Bot })[] }) {
  const { data: bots } = useSuspenseQuery(rpc.bots.list.queryOptions());
  const { data: rooms } = useSuspenseQuery(rpc.rooms.list.queryOptions());
  const target = roomMentionTarget(href);
  const bot = target?.kind === 'bot' ? bots.find((candidate) => candidate.id === target.id) : undefined;
  const room = target?.kind === 'room' ? rooms.find((candidate) => candidate.id === target.id) : undefined;
  const everyone = target?.kind === 'everyone';
  const skill = target?.kind === 'skill' ? skills.find((candidate) => candidate.name === target.id) : undefined;

  if (skill) {
    return (
      <>
        <IconBox className="size-5 shrink-0 p-1 text-muted-foreground/60" />
        <span className="max-w-[45%] shrink-0 truncate font-medium">{botSkillName({ name: skill.name })}</span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{skill.description}</span>
        <Badge className="ms-auto" variant="soft">
          {skill.source === 'bot' ? (
            <><BotAvatar
              animate={false}
              bot={skill.bot}
              size={12}
            />{skill.bot.name}</>
          ) : <><IconLibrary />{m.rooms_mention_skill_shared()}</>}
        </Badge>
      </>
    );
  }

  return (
    <>
      {bot ? (
        <BotAvatar
          animate={false}
          bot={bot}
          size={20}
        />
      ) : null}
      {everyone ? <IconUsers className="size-5 shrink-0 p-1 text-muted-foreground/60" /> : null}
      {room ? <IconHash className="size-5 shrink-0 p-1 text-muted-foreground/60" /> : null}
      <span className="max-w-[45%] shrink-0 truncate font-medium">{everyone ? m.rooms_mention_everyone() : bot?.name ?? room?.name ?? label}</span>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{bot?.instructions}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </>
  );
}
