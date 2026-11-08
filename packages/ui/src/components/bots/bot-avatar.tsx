import { BOT_ACTIVITY_LABELS, botBlobPresentation } from '@repo/client/client';
import { useBotCheer } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { match } from 'ts-pattern';
import { cn } from '../../lib/cn';
import { AvatarBlob } from '../avatars/avatar-blob';
import type { BotAvatar as BotAvatarValue, ChatActivity } from '@repo/client/client';

interface BotAvatarProps {
  isOrbSized?: boolean
  isPictureSized?: boolean
  bot: { name: string; avatar?: BotAvatarValue }
  activity?: ChatActivity
  size?: number
  animate?: boolean
  cheer?: boolean
  className?: string
}

export function BotAvatar({ bot, activity = 'idle', size = 32, animate, cheer = true, isOrbSized = false, isPictureSized = false, className }: BotAvatarProps) {
  const avatar = bot.avatar;
  const busy = activity === 'thinking' || activity === 'working' || activity === 'writing' || activity === 'compacting';
  const cheering = useBotCheer();
  const idle = activity === 'idle';
  const moving = (idle && cheering.moving) || (animate ?? busy);
  const presentation = botBlobPresentation({ avatar, activity });
  const isPicture = avatar?.kind === 'image' || avatar?.kind === 'color' || avatar?.kind === 'emoji';

  const image = match(avatar)
    .with({ kind: 'image' }, ({ src }) => (
      <img
        alt=""
        className="size-full rounded-full object-cover"
        src={src}
      />
    ))
    .with({ kind: 'color' }, ({ color }) => <span className="block size-full rounded-full" style={{ backgroundColor: color }} />)
    .with({ kind: 'emoji' }, ({ emoji, color }) => (
      <span className="flex-center size-full rounded-full leading-none" style={{ backgroundColor: color, fontSize: size * 0.55 }}>{emoji}</span>
    ))
    .otherwise(() => (
      <AvatarBlob
        {...presentation}
        animate={moving}
        className={cn('size-full', isPictureSized && 'scale-150')}
        expression={idle && cheering.happy ? 'happy' : presentation.expression}
        fps={30}
        size={size}
      />
    ));

  const label = m.avatars_bot_label({ bot: bot.name, activity: BOT_ACTIVITY_LABELS[activity]() });

  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      title={label}
      {...(cheer ? cheering.handlers : {})}
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className={cn('size-full', isOrbSized && isPicture && 'scale-64')}>{image}</span>
    </span>
  );
}
