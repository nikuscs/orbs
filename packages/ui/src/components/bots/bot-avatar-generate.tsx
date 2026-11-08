import { useBotAvatarGenerate } from '@repo/client/react';
import { AVATAR } from '@repo/contracts/universal';
import { m } from '@repo/i18n/client';
import { useId, useState } from 'react';
import IconSparkles from '~icons/lucide/sparkles';
import { Button } from '../button';
import { Label } from '../label';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { Textarea } from '../textarea';
import type { BotAvatar } from '@repo/client/client';
import type { FormEvent, KeyboardEvent } from 'react';

interface BotAvatarGenerateProps {
  density?: 'default' | 'compact'
  disabled: boolean
  onGenerated: (avatar: BotAvatar) => void
}

export function BotAvatarGenerate({ density = 'default', disabled, onGenerated }: BotAvatarGenerateProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const generate = useBotAvatarGenerate();
  const fieldId = useId();
  const errorId = useId();
  const canSubmit = description.trim().length > 0 && !generate.isPending;

  function submit() {
    if (!canSubmit) {
      return;
    }

    generate.mutate({ description }, {
      onSuccess: (avatar) => {
        setOpen(false);
        setDescription('');
        onGenerated(avatar);
      },
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) {
      return;
    }

    event.preventDefault();
    submit();
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);

        if (!next) {
          generate.reset();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          aria-label={m.avatars_generate()}
          disabled={disabled}
          size={density === 'compact' ? 'icon-sm' : 'sm'}
          title={m.avatars_generate()}
          type="button"
          variant="ghost"
        >
          <IconSparkles />
          {density === 'compact' ? null : m.avatars_generate()}
        </Button>
      </PopoverTrigger>
      <PopoverContent arrow={false} className="w-80">
        <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
          <Label htmlFor={fieldId}>{m.avatars_generate_label()}</Label>
          <Textarea
            aria-describedby={generate.isError ? errorId : undefined}
            aria-invalid={generate.isError}
            disabled={generate.isPending}
            id={fieldId}
            maxLength={AVATAR.generateDescriptionMaxLength}
            placeholder={m.avatars_generate_placeholder()}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          {generate.isError
            ? <p className="text-sm text-destructive" id={errorId} role="alert">{m.avatars_generate_error()}</p>
            : null}
          <Button className="self-end" disabled={!canSubmit} size="sm" type="submit">
            {generate.isPending ? m.avatars_generate_pending() : m.avatars_generate_submit()}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
