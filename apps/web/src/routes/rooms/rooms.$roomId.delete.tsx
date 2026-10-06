import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { RoomsDeleteDialog } from '@/components/rooms/rooms-delete-dialog';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';
import { rpc } from '@/services/rpc/rpc.client';

export const Route = createFileRoute('/_chat/rooms/$roomId/delete')({
  loader: async ({ context, params }) => {
    const rooms = await context.queryClient.ensureQueryData(rpc.rooms.list.queryOptions());
    const room = rooms.find((item) => item.id === params.roomId && item.kind === 'group');

    if (!room) {
      throw notFound();
    }

    return { room };
  },
  component: RoomDeleteRoute,
});

function RoomDeleteRoute() {
  const { room } = Route.useLoaderData();
  const navigate = useNavigate();
  const { handleOpenChange } = useDialogNavigation({ to: '/rooms/$roomId', params: { roomId: room.id } });

  return (
    <RoomsDeleteDialog
      room={room}
      onDeleted={() => navigate({ to: '/rooms' })}
      onOpenChange={handleOpenChange}
    />
  );
}
