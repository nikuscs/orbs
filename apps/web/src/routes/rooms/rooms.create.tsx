import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { RoomsCreateDialog } from '@/components/rooms/rooms-create-dialog';
import { RoomsPage } from '@/components/rooms/rooms-page';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';
import { rpc } from '@/services/rpc/rpc.client';

export const Route = createFileRoute('/_chat/rooms/create')({
  component: RoomCreateRoute,
});

function RoomCreateRoute() {
  const navigate = useNavigate();
  const { data: bots } = useSuspenseQuery(rpc.bots.list.queryOptions());
  const { handleOpenChange } = useDialogNavigation({ to: '/rooms' });

  return (
    <>
      <RoomsPage />
      <RoomsCreateDialog
        bots={bots}
        onCreated={(room) => void navigate({ to: '/rooms/$roomId', params: { roomId: room.id } })}
        onOpenChange={handleOpenChange}
      />
    </>
  );
}
