import { m } from '@orbs/i18n/client';
import { cva } from 'cva';
import { BotAvatar } from '@/components/bots/bot-avatar';
import { cn } from '@/lib/cn';
import { botDefaultAvatar } from '@orbs/server/client';
import type { BotActivity } from '@/types/bot.types';
import type { Bot } from '@orbs/server/client';
import type { CSSProperties } from 'react';

const roomAvatarVariants = cva({
  base: 'absolute bottom-0 flex rounded-full p-px',
  variants: {
    variant: {
      default: 'bg-background',
      secondary: 'bg-sidebar group-hover/room-item:bg-sidebar-accent group-data-[active=true]/room-item:bg-sidebar-accent',
    },
  },
});

interface RoomAvatarProps {
  members: Bot[]
  leaderId: string | null
  size: number
  activities?: Map<string, BotActivity>
  animate?: boolean
  variant?: 'default' | 'secondary'
  className?: string
}

export function RoomAvatar({ members, leaderId, size, activities, animate, variant = 'default', className }: RoomAvatarProps) {
  const ordered = [...members].sort((a, b) => Number(b.id === leaderId) - Number(a.id === leaderId));
  const captain = ordered.at(0);
  const crew = ordered.slice(1);

  if (!captain) {
    return (
      <BotAvatar
        animate={false}
        bot={{ name: m.rooms_no_members(), avatar: { ...botDefaultAvatar, expression: 'sad' } }}
        className={className}
        size={size}
      />
    );
  }

  const row = crew.slice(0, 3);
  const threeCrewOverlap = row.length === 3;
  const [captainSize, crewSize] = threeCrewOverlap ? [size * 0.66, size * 0.44] : [size * 0.62, size * 0.52];

  const avatar = (bot: Bot, botSize: number, place?: 'left' | 'center') => (
    <BotAvatar
      activity={activities?.get(bot.id)}
      animate={animate}
      bot={bot}
      className={cn(place === 'left' && 'absolute top-0 left-0', place === 'center' && 'absolute top-0 left-1/2 -translate-x-1/2')}
      size={Math.round(botSize)}
    />
  );

  const front = (bot: Bot, botSize: number, place: CSSProperties) => (
    <span
      className={roomAvatarVariants({ variant })}
      key={bot.id}
      style={place}
    >{avatar(bot, botSize - 2)}</span>
  );

  if (crew.length === 0) {
    return (
      <BotAvatar
        activity={activities?.get(captain.id)}
        animate={animate}
        bot={captain}
        className={className}
        size={size}
      />
    );
  }

  return (
    <span className={cn('relative inline-block shrink-0', className)} style={{ width: size, height: size }}>
      {crew.length === 1 ? (
        <>
          {avatar(crew[0], size * 0.62, 'left')}
          {front(captain, size * 0.7, { right: 0 })}
        </>
      ) : (
        <>
          {avatar(captain, captainSize, 'center')}
          {row.map((bot, index) => front(bot, crewSize, { left: index * (size - crewSize) / (row.length - 1) }))}
        </>
      )}
    </span>
  );
}
