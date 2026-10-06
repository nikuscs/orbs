import { m } from '@orbs/i18n/client';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { BotAvatar } from '@/components/bots/bot-avatar';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import IconMessageCircle from '~icons/lucide/message-circle';
import type { Bot } from '@orbs/server/client';
import type { ReactNode } from 'react';

export function RoomsMentionCard({ bot, children }: { bot: Bot; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openOnTap = () => setOpen(true);

  return (
    <HoverCard
      closeDelay={100}
      open={open}
      openDelay={200}
      onOpenChange={setOpen}
    >
      <HoverCardTrigger asChild>
        <button
          className="cursor-pointer align-middle outline-none focus-visible:*:ring-2 focus-visible:*:ring-ring"
          type="button"
          onClick={openOnTap}
        >
          {children}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="flex w-auto min-w-44 flex-col gap-3 p-3" side="top">
        <div className="flex min-w-0 items-center gap-3">
          <BotAvatar
            animate={false}
            bot={bot}
            size={32}
          />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{bot.name}</span>
            <span className="truncate text-xs text-muted-foreground">@{bot.handle}</span>
          </div>
        </div>
        <Button
          asChild
          className="w-full"
          size="xs"
          variant="outline"
        >
          <Link params={{ handle: bot.handle }} to="/rooms/direct/$handle">
            <IconMessageCircle />
            {m.rooms_mention_direct()}
          </Link>
        </Button>
      </HoverCardContent>
    </HoverCard>
  );
}
