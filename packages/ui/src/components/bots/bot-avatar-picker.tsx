import { EXPRESSIONS } from '@repo/avatar-blobs/expressions';
import { BODIES, COLORS } from '@repo/avatar-blobs/skins';
import { AVATAR_BODY_LABELS, AVATAR_COLOR_LABELS, AVATAR_EXPRESSION_LABELS, BOT, botAvatarColor, botAvatarEmoji, botAvatarRecolor } from '@repo/client/client';
import { useAvatarSettings, useBotAvatarFlash, useBotAvatarUpload } from '@repo/client/react';
import { AVATAR } from '@repo/contracts/universal';
import { m } from '@repo/i18n/client';
import { useRef } from 'react';
import IconChevronLeft from '~icons/lucide/chevron-left';
import IconChevronRight from '~icons/lucide/chevron-right';
import IconImageUp from '~icons/lucide/image-up';
import { cn } from '../../lib/cn';
import { Button } from '../button';
import { BotAvatar } from './bot-avatar';
import { BotAvatarEmoji } from './bot-avatar-emoji';
import { BotAvatarGenerate } from './bot-avatar-generate';
import type { BotAvatar as BotAvatarValue } from '@repo/client/client';
import type { MouseEvent } from 'react';

const revealOnHover = 'opacity-0 group-focus-within/avatar:opacity-100 group-hover/avatar:opacity-100 pointer-coarse:opacity-100';

interface BotAvatarPickerProps {
  name: string
  value: BotAvatarValue
  onChange: (avatar: BotAvatarValue) => void
  disabled?: boolean
  density?: 'default' | 'compact'
}

export function BotAvatarPicker({ name, value, onChange, disabled = false, density = 'default' }: BotAvatarPickerProps) {
  const isCompact = density === 'compact';

  function cycle<T extends { id: string }>(items: readonly T[], currentId: string, step: number): T {
    const index = items.findIndex((item) => item.id === currentId);

    return items[(index + step + items.length) % items.length] ?? items[0];
  }

  const blob = value?.kind === 'blob' ? value : BOT.defaultAvatar;
  const { moving, label, flash } = useBotAvatarFlash();
  const color = botAvatarColor({ avatar: value });
  const upload = useBotAvatarUpload();
  const { isAvailable: canGenerate } = useAvatarSettings();
  const fileInput = useRef<HTMLInputElement>(null);

  function shiftBody(step: number) {
    const body = cycle(BODIES, blob.body, step);

    flash(AVATAR_BODY_LABELS[body.id](), () => onChange({ ...blob, body: body.id }));
  }

  function shiftMood(event: MouseEvent) {
    const expression = cycle(EXPRESSIONS, blob.expression, event.shiftKey ? -1 : 1);

    flash(AVATAR_EXPRESSION_LABELS[expression.id](), () => onChange({ ...blob, expression: expression.id }));
  }

  return (
    <div className={cn('group/avatar flex flex-col items-center', !isCompact && '-mt-4')}>
      <div className={cn('flex items-center', isCompact ? 'gap-0' : 'gap-2')}>
        <Button
          aria-label={m.avatars_body_previous()}
          className={revealOnHover}
          disabled={disabled}
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={() => shiftBody(-1)}
        >
          <IconChevronLeft />
        </Button>
        <button
          aria-label={m.avatars_mood_next()}
          className="shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          disabled={disabled}
          title={m.avatars_mood_next()}
          type="button"
          onClick={shiftMood}
        >
          <BotAvatar
            animate={moving}
            bot={{ name, avatar: value }}
            cheer={false}
            size={isCompact ? 96 : 144}
          />
        </button>
        <Button
          aria-label={m.avatars_body_next()}
          className={revealOnHover}
          disabled={disabled}
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={() => shiftBody(1)}
        >
          <IconChevronRight />
        </Button>
      </div>
      <output aria-live="polite" className="sr-only">{label}</output>
      <fieldset
        aria-label={m.avatars_color()}
        className={cn('flex justify-center', isCompact ? 'mt-2' : '-mt-2')}
        disabled={disabled}
      >
        {COLORS.map(({ id, hex }) => (
          <button
            aria-label={AVATAR_COLOR_LABELS[id]()}
            aria-pressed={color === id}
            className={cn(
              'relative -ml-1 rounded-full ring-2 ring-background transition-transform outline-none first:ml-0 hover:z-10 hover:scale-125 focus-visible:z-10 focus-visible:ring-ring aria-pressed:z-10 aria-pressed:scale-125 aria-pressed:shadow-sm',
              isCompact ? 'size-3.5' : 'size-5',
            )}
            key={id}
            style={{ backgroundColor: hex }}
            title={AVATAR_COLOR_LABELS[id]()}
            type="button"
            onClick={() => flash(AVATAR_COLOR_LABELS[id](), () => onChange(botAvatarRecolor({ avatar: value, color: id })))}
          />
        ))}
      </fieldset>
      <div className="mt-3 flex gap-1">
        <Button
          aria-label={m.avatars_upload()}
          disabled={disabled || upload.isPending}
          size={isCompact ? 'icon-sm' : 'sm'}
          title={m.avatars_upload()}
          type="button"
          variant="ghost"
          onClick={() => fileInput.current?.click()}
        >
          <IconImageUp />
          {isCompact ? null : m.avatars_upload()}
        </Button>
        {canGenerate
          ? (
            <BotAvatarGenerate
              density={density}
              disabled={disabled}
              onGenerated={onChange}
            />
          )
          : null}
        <BotAvatarEmoji
          density={density}
          disabled={disabled}
          onPick={(emoji) => onChange(botAvatarEmoji({ avatar: value, emoji }))}
        />
      </div>
      <input
        hidden
        accept={AVATAR.mediaTypes.join(',')}
        ref={fileInput}
        type="file"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';

          if (file) {
            upload.mutate({ file }, { onSuccess: onChange });
          }
        }}
      />
    </div>
  );
}
