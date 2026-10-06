import { m } from '@orbs/i18n/client';
import { AvatarBlob } from '@/components/avatars/avatar-blob';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useBotCheer } from '@/hooks/use-bot-cheer';
import { cn } from '@/lib/cn';
import { botBlobPresentation } from '@/services/bot/bot.client';
import { BOT_ACTIVITY_LABELS } from '@/services/bot/bot.constants';
import type { BotActivity } from '@/types/bot.types';
import type { BotAvatarPreference } from '@orbs/server/client';

interface BotAvatarProps {
  bot: { name: string; avatar?: BotAvatarPreference | null }
  activity?: BotActivity
  size?: number
  animate?: boolean
  cheer?: boolean
  className?: string
}

export function BotAvatar({ bot, activity = 'idle', size = 32, animate, cheer = true, className }: BotAvatarProps) {
  const avatar = bot.avatar;
  const busy = activity === 'thinking' || activity === 'working' || activity === 'writing' || activity === 'compacting' || activity === 'retrying';
  const cheering = useBotCheer();
  const idle = activity === 'idle';
  const moving = (idle && cheering.moving) || (animate ?? busy);
  const presentation = botBlobPresentation({ avatar, activity });

  const blob = (
    <AvatarBlob
      {...presentation}
      animate={moving}
      className="size-full"
      expression={idle && cheering.happy ? 'happy' : presentation.expression}
      fps={30}
      size={size}
    />
  );

  const label = m.avatars_bot_label({ bot: bot.name, activity: BOT_ACTIVITY_LABELS[activity]() });

  let content = blob;

  if (avatar?.kind === 'image') {
    content = (
      <Avatar className="size-full">
        <AvatarImage alt="" src={avatar.src} />
        <AvatarFallback>{blob}</AvatarFallback>
      </Avatar>
    );
  } else if (avatar?.kind === 'color' || avatar?.kind === 'emoji') {
    content = (
      <span className="flex-center size-full rounded-full ring-1 ring-black/10" style={{ backgroundColor: avatar.color, fontSize: size * 0.55 }}>
        {avatar.kind === 'emoji' ? avatar.emoji : null}
      </span>
    );
  }

  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      title={label}
      {...(cheer && (!avatar || avatar.kind === 'blob') ? cheering.handlers : {})}
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="size-full">{content}</span>
      {avatar && avatar.kind !== 'blob' && activity !== 'idle' ? (
        <span
          aria-hidden="true"
          className={cn('absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2 ring-background', activity === 'failed' ? 'bg-destructive' : 'bg-primary', busy && moving && 'motion-safe:animate-pulse')}
        />
      ) : null}
    </span>
  );
}
