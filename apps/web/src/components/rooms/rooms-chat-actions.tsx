import { m } from '@orbs/i18n/client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { RoomsChatEmojiChoices } from '@/components/rooms/rooms-chat-emoji-choices';
import { RoomsChatInfo } from '@/components/rooms/rooms-chat-info';
import { RoomsChatReactionPicker } from '@/components/rooms/rooms-chat-reaction-picker';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { toasty } from '@/components/ui/sonner';
import { cn } from '@/lib/cn';
import { roomsMessageText } from '@/services/rooms/rooms.client';
import { ROOMS } from '@/services/rooms/rooms.constants';
import { rpc } from '@/services/rpc/rpc.client';
import IconCheck from '~icons/lucide/check';
import IconCopy from '~icons/lucide/copy';
import IconEllipsisVertical from '~icons/lucide/ellipsis-vertical';
import IconInfo from '~icons/lucide/info';
import IconReply from '~icons/lucide/reply';
import type { RoomUIMessage, TenantRoomSummary } from '@orbs/server/client';

export function RoomsChatActions({ message, trigger, room, sheet, reacting = false, onSheetChange, onReply, onReact }: {
  message: RoomUIMessage
  trigger?: RoomUIMessage
  room: TenantRoomSummary
  sheet: boolean
  reacting?: boolean
  onSheetChange: (open: boolean) => void
  onReply?: () => void
  onReact?: (emoji: string) => void
}) {
  const { data: bots } = useSuspenseQuery(rpc.bots.list.queryOptions());
  const [copied, setCopied] = useState(false);

  const info = (
    <RoomsChatInfo
      bots={bots}
      message={message}
      room={room}
      trigger={trigger}
    />
  );

  const copy = async () => {
    await navigator.clipboard.writeText(roomsMessageText(message));
    setCopied(true);
    setTimeout(() => setCopied(false), ROOMS.copiedMs);
  };

  const fromSheet = (action: () => void) => {
    onSheetChange(false);
    action();
  };

  return (
    <div className="flex shrink-0 items-center">
      <div className="flex items-center opacity-0 transition-opacity duration-100 group-hover:opacity-100 focus-within:opacity-100 has-data-[state=open]:opacity-100 motion-reduce:transition-none pointer-coarse:hidden">
        {onReact ? <RoomsChatReactionPicker disabled={reacting} onPick={onReact} /> : null}
        {onReply ? (
          <Button
            aria-label={m.rooms_chat_reply()}
            size="icon-xs"
            title={m.rooms_chat_reply()}
            variant="quiet"
            onClick={onReply}
          >
            <IconReply className={cn('size-3.5', message.role === 'user' && '-scale-x-100')} />
          </Button>
        ) : null}
        <Button
          aria-label={copied ? m.rooms_chat_copied() : m.rooms_chat_copy()}
          size="icon-xs"
          title={m.rooms_chat_copy()}
          variant="quiet"
          onClick={() => void copy()}
        >
          {copied ? <IconCheck className="size-3.5" /> : <IconCopy className="size-3.5" />}
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              aria-label={m.rooms_chat_info()}
              size="icon-xs"
              title={m.rooms_chat_info()}
              variant="quiet"
            >
              <IconInfo className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            arrow={false}
            className="w-64 p-3"
          >{info}</PopoverContent>
        </Popover>
      </div>
      <Drawer open={sheet} onOpenChange={onSheetChange}>
        <DrawerTrigger asChild>
          <Button
            aria-label={m.rooms_chat_actions()}
            className="hidden pointer-coarse:inline-flex"
            size="icon-xs"
            variant="quiet"
          >
            <IconEllipsisVertical className="size-3.5" />
          </Button>
        </DrawerTrigger>
        <DrawerContent aria-describedby={undefined}>
          <DrawerTitle className="sr-only">{m.rooms_chat_actions()}</DrawerTitle>
          <div className="flex flex-col gap-2 overflow-y-auto px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {onReact ? (
              <RoomsChatEmojiChoices
                disabled={reacting}
                layout="sheet"
                onPick={(emoji) => fromSheet(() => onReact(emoji))}
              />
            ) : null}
            <div className="flex flex-col">
              {onReply ? (
                <Button
                  className="justify-start"
                  size="lg"
                  variant="ghost"
                  onClick={() => fromSheet(onReply)}
                >
                  <IconReply className="size-4 text-muted-foreground" />
                  {m.rooms_chat_reply()}
                </Button>
              ) : null}
              <Button
                className="justify-start"
                size="lg"
                variant="ghost"
                onClick={() => fromSheet(() => void copy().then(() => toasty(m.rooms_chat_copied(), '📋')))}
              >
                <IconCopy className="size-4 text-muted-foreground" />
                {m.rooms_chat_copy()}
              </Button>
            </div>
            <Separator />
            <div className="px-3 py-2">{info}</div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
