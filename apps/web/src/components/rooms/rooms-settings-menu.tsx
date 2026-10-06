import { Slot as SlotPrimitive } from 'radix-ui';
import { useRef, useState } from 'react';
import { RoomsActions } from '@/components/rooms/rooms-actions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { TenantRoomSummary } from '@orbs/server/client';
import type { ComponentProps, MouseEvent, ReactElement } from 'react';

interface RoomsSettingsMenuProps {
  room: TenantRoomSummary
  children: ReactElement
  directHandle?: string
  onRename?: () => void
  button?: ReactElement
  align?: ComponentProps<typeof DropdownMenuContent>['align']
}

export function RoomsSettingsMenu({ room, children, directHandle, onRename, button, align = 'start' }: RoomsSettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const skipTriggerRefocus = useRef(false);

  const openOnRightClick = (event: MouseEvent) => {
    if (event.target === document.activeElement) {
      return;
    }

    event.preventDefault();
    setOpen(true);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      {button ? (
        <>
          <SlotPrimitive.Slot onContextMenu={openOnRightClick}>{children}</SlotPrimitive.Slot>
          <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
        </>
      ) : (
        <DropdownMenuTrigger
          asChild
          onContextMenu={openOnRightClick}
          onPointerDown={(event) => event.preventDefault()}
        >
          {children}
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        align={align}
        onCloseAutoFocus={(event) => {
          if (!skipTriggerRefocus.current) {
            return;
          }

          skipTriggerRefocus.current = false;
          event.preventDefault();
        }}
      >
        <RoomsActions
          directHandle={directHandle}
          room={room}
          onRename={onRename ? () => {
            skipTriggerRefocus.current = true;
            onRename();
          } : undefined}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
