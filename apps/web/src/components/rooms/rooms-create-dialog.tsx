import { m } from '@orbs/i18n/client';
import { RoomsForm } from '@/components/rooms/rooms-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Bot, TenantRoomSummary } from '@orbs/server/client';

interface RoomsCreateDialogProps {
  bots: Bot[];
  onOpenChange: (open: boolean) => void;
  onCreated: (room: TenantRoomSummary) => void
}

export function RoomsCreateDialog({ bots, onOpenChange, onCreated }: RoomsCreateDialogProps) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.rooms_create_title()}</DialogTitle>
          <DialogDescription className="sr-only">{m.rooms_create_name()}</DialogDescription>
        </DialogHeader>
        {bots.length === 0 ? <p className="text-sm text-muted-foreground">{m.rooms_create_needs_bot()}</p> : <RoomsForm bots={bots} onSaved={onCreated} />}
      </DialogContent>
    </Dialog>
  );
}
