import { m } from '@orbs/i18n/client';
import { useState } from 'react';
import { RoomsChatEmojiChoices } from '@/components/rooms/rooms-chat-emoji-choices';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import IconSmile from '~icons/lucide/smile';

export function RoomsChatReactionPicker({ disabled, onPick }: { disabled: boolean; onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);

  const pick = (emoji: string) => {
    setOpen(false);
    onPick(emoji);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label={m.rooms_reaction_add()}
          disabled={disabled}
          size="icon-xs"
          title={m.rooms_reaction_add()}
          variant="quiet"
        >
          <IconSmile className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        arrow={false}
        className="w-auto p-0"
      >
        <RoomsChatEmojiChoices layout="popover" onPick={pick} />
      </PopoverContent>
    </Popover>
  );
}
