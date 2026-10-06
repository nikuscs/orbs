import { m } from '@orbs/i18n/client';
import { MemoryPanel } from '@/components/memory/memory-panel';
import { MemoryWipeLink } from '@/components/memory/memory-wipe-link';
import { RoomsForm } from '@/components/rooms/rooms-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Bot, TenantRoomSummary } from '@orbs/server/client';

interface RoomsSettingsDialogProps {
  bots: Bot[];
  room: TenantRoomSummary;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function RoomsSettingsDialog({ bots, room, onOpenChange, onSaved }: RoomsSettingsDialogProps) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] grid-cols-1 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{m.rooms_settings_title({ room: room.name })}</DialogTitle>
          <DialogDescription className="sr-only">{m.rooms_settings_hint()}</DialogDescription>
        </DialogHeader>
        <RoomsForm
          bots={bots}
          room={room}
          onSaved={onSaved}
        />
        <MemoryPanel scope={{ scope: 'room', ownerId: room.id }} />
        <MemoryWipeLink scope={{ scope: 'room', ownerId: room.id }} />
      </DialogContent>
    </Dialog>
  );
}
