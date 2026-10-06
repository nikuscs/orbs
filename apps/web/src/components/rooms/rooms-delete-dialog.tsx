import { m } from '@orbs/i18n/client';
import { useMutation } from '@tanstack/react-query';
import { ConfirmationDialog } from '@/components/ui/alert-dialog';
import { useRoomsRefresh } from '@/hooks/use-rooms-refresh';
import { rpc } from '@/services/rpc/rpc.client';
import type { TenantRoomSummary } from '@orbs/server/client';

interface RoomsDeleteDialogProps {
  room: TenantRoomSummary;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => Promise<void>
}

export function RoomsDeleteDialog({ room, onOpenChange, onDeleted }: RoomsDeleteDialogProps) {
  const refresh = useRoomsRefresh();

  const remove = useMutation(rpc.rooms.delete.mutationOptions({
    onSuccess: async () => {
      await onDeleted();
      await refresh();
    },
  }));

  return (
    <ConfirmationDialog
      confirmLabel={m.rooms_action_delete()}
      pending={remove.isPending}
      title={m.rooms_delete_title({ room: room.name })}
      variant="red"
      onConfirm={() => remove.mutate({ roomId: room.id })}
      onOpenChange={onOpenChange}
    >
      {m.rooms_delete_description()}
    </ConfirmationDialog>
  );
}
