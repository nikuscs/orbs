import { BOT_ACTIVITY_LABELS, botBlobPresentation } from '@repo/client/client';
import { useBotCheer } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { cva } from 'cva';
import { match } from 'ts-pattern';
import { cn } from '../../lib/cn';
import { AvatarBlob } from '../avatars/avatar-blob';
import type { BotAvatar as BotAvatarValue, ChatActivity } from '@repo/client/client';
import type { VariantProps } from 'cva';

// `detail` shrinks pictures to the orb's visual size; `row` grows the orb to fill a picture's circle.
const botAvatarPictureVariants = cva({
  base: 'size-full',
  variants: { variant: { default: '', detail: 'scale-64', row: '' } },
  defaultVariants: { variant: 'default' },
});

const botAvatarOrbVariants = cva({
  base: 'size-full',
  variants: { variant: { default: '', detail: '', row: 'scale-150' } },
  defaultVariants: { variant: 'default' },
});

interface BotAvatarProps extends VariantProps<typeof botAvatarPictureVariants> {
  bot: { name: string; avatar?: BotAvatarValue }
  activity?: ChatActivity
  size?: number
  animate?: boolean
  cheer?: boolean
  className?: string
}

export function BotAvatar({ bot, activity = 'idle', size = 32, animate, cheer = true, variant, className }: BotAvatarProps) {
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
        className={botAvatarOrbVariants({ variant })}
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
      <span aria-hidden="true" className={isPicture ? botAvatarPictureVariants({ variant }) : 'size-full'}>{image}</span>
    </span>
  );
}
