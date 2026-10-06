import { EXPRESSIONS } from '@orbs/avatar-blobs/expressions';
import { BODIES, COLORS } from '@orbs/avatar-blobs/skins';
import { m } from '@orbs/i18n/client';
import { BotAvatar } from '@/components/bots/bot-avatar';
import { Button } from '@/components/ui/button';
import { useBotAvatarFlash } from '@/hooks/use-bot-avatar-flash';
import { AVATAR_BODY_LABELS, AVATAR_COLOR_LABELS, AVATAR_EXPRESSION_LABELS } from '@/services/avatar/avatar.constants';
import { botDefaultAvatar } from '@orbs/server/client';
import IconChevronLeft from '~icons/lucide/chevron-left';
import IconChevronRight from '~icons/lucide/chevron-right';
import type { BotAvatarPreference } from '@orbs/server/client';
import type { MouseEvent } from 'react';

interface BotAvatarPickerProps {
  name: string
  value: BotAvatarPreference | null
  onChange: (avatar: BotAvatarPreference) => void
  disabled?: boolean
}

const revealOnHover = 'opacity-0 group-focus-within/avatar:opacity-100 group-hover/avatar:opacity-100 pointer-coarse:opacity-100';

export function BotAvatarPicker({ name, value, onChange, disabled = false }: BotAvatarPickerProps) {
  function cycle<T extends { id: string }>(items: readonly T[], currentId: string, step: number): T {
    const index = items.findIndex((item) => item.id === currentId);

    return items[(index + step + items.length) % items.length] ?? items[0];
  }

  const blob = value?.kind === 'blob' ? value : botDefaultAvatar;
  const { moving, label, flash } = useBotAvatarFlash();

  function shiftBody(step: number) {
    const body = cycle(BODIES, blob.body, step);

    flash(AVATAR_BODY_LABELS[body.id](), () => onChange({ ...blob, body: body.id }));
  }

  function shiftMood(event: MouseEvent) {
    const expression = cycle(EXPRESSIONS, blob.expression, event.shiftKey ? -1 : 1);

    flash(AVATAR_EXPRESSION_LABELS[expression.id](), () => onChange({ ...blob, expression: expression.id }));
  }

  return (
    <div className="group/avatar -mt-4 flex flex-col items-center">
      <div className="flex items-center gap-2">
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
          className="shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          disabled={disabled}
          title={m.avatars_mood_next()}
          type="button"
          onClick={shiftMood}
        >
          <BotAvatar
            animate={moving}
            bot={{ name, avatar: value }}
            cheer={false}
            size={144}
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
        className="-mt-2 flex justify-center"
        disabled={disabled}
      >
        {COLORS.map(({ id, hex }) => (
          <button
            aria-label={AVATAR_COLOR_LABELS[id]()}
            aria-pressed={blob.color === id}
            className="relative -ml-1 size-5 cursor-pointer rounded-full ring-2 ring-background transition-transform outline-none first:ml-0 hover:z-10 hover:scale-125 focus-visible:z-10 focus-visible:ring-ring aria-pressed:z-10 aria-pressed:scale-125 aria-pressed:shadow-sm"
            key={id}
            style={{ backgroundColor: hex }}
            title={AVATAR_COLOR_LABELS[id]()}
            type="button"
            onClick={() => flash(AVATAR_COLOR_LABELS[id](), () => onChange({ ...blob, color: id }))}
          />
        ))}
      </fieldset>
    </div>
  );
}
