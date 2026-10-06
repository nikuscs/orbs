import { m } from '@orbs/i18n/client';
import { getLocale } from '@orbs/i18n/runtime';
import { cva } from 'cva';
import { useState } from 'react';
import { RoomsChatEmojiLoading } from '@/components/rooms/rooms-chat-emoji-loading';
import { Button } from '@/components/ui/button';
import { EmojiPicker, EmojiPickerContent, EmojiPickerSearch } from '@/components/ui/emoji-picker';
import { ROOMS } from '@/services/rooms/rooms.constants';
import IconSmilePlus from '~icons/lucide/smile-plus';
import type { VariantProps } from 'cva';

const roomsChatEmojiChoicesVariants = cva({
  base: 'flex items-center',
  variants: {
    layout: {
      popover: 'gap-0.5 p-1',
      sheet: 'justify-between',
    },
  },
});

interface RoomsChatEmojiChoicesProps extends Required<VariantProps<typeof roomsChatEmojiChoicesVariants>> {
  disabled?: boolean;
  onPick: (emoji: string) => void
}

export function RoomsChatEmojiChoices({ layout, disabled = false, onPick }: RoomsChatEmojiChoicesProps) {
  const [full, setFull] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (full) {
    return (
      <EmojiPicker
        className={layout === 'sheet' ? 'h-72 w-full **:data-[slot=emoji-picker-row]:flex **:data-[slot=emoji-picker-row]:justify-between' : 'h-80'}
        columns={8}
        key={attempt}
        locale={getLocale()}
        onEmojiSelect={({ emoji }) => onPick(emoji)}
      >
        <EmojiPickerSearch
          aria-label={m.rooms_reaction_search()}
          placeholder={m.rooms_reaction_search()}
          ref={(node) => node?.focus()}
        />
        <EmojiPickerContent empty={m.rooms_reaction_empty()} loading={<RoomsChatEmojiLoading onRetry={() => setAttempt((count) => count + 1)} />} />
      </EmojiPicker>
    );
  }

  return (
    <div className={roomsChatEmojiChoicesVariants({ layout })}>
      {ROOMS.quickReactions.map((emoji) => (
        <Button
          aria-label={m.rooms_reaction_quick({ emoji })}
          disabled={disabled}
          key={emoji}
          size={layout === 'sheet' ? 'icon' : 'icon-sm'}
          title={m.rooms_reaction_quick({ emoji })}
          variant="ghost"
          onClick={() => onPick(emoji)}
        >
          <span className={layout === 'sheet' ? 'text-xl' : 'text-base'}>{emoji}</span>
        </Button>
      ))}
      <Button
        aria-label={m.rooms_reaction_more()}
        size={layout === 'sheet' ? 'icon' : 'icon-sm'}
        title={m.rooms_reaction_more()}
        variant="quiet"
        onClick={() => setFull(true)}
      >
        <IconSmilePlus className="size-4" />
      </Button>
    </div>
  );
}
