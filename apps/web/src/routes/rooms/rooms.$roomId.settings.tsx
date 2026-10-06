import { createFileRoute, notFound } from '@tanstack/react-router';
import { RoomsSettingsDialog } from '@/components/rooms/rooms-settings-dialog';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';
import { rpc } from '@/services/rpc/rpc.client';

export const Route = createFileRoute('/_chat/rooms/$roomId/settings')({
  loader: async ({ context, params }) => {
    const [rooms, bots] = await Promise.all([
      context.queryClient.ensureQueryData(rpc.rooms.list.queryOptions()),
      context.queryClient.ensureQueryData(rpc.bots.list.queryOptions()),
      context.queryClient.ensureQueryData(rpc.organization.settings.queryOptions()),
    ]);

    const room = rooms.find((item) => item.id === params.roomId);

    if (!room) {
      throw notFound();
    }

    return { room, bots };
  },
  component: RoomSettingsRoute,
});

function RoomSettingsRoute() {
  const { roomId } = Route.useParams();
  const { handleOpenChange, navigate } = useDialogNavigation({ to: '/rooms/$roomId', params: { roomId } });

  const { room, bots } = Route.useLoaderData();

  return (
    <RoomsSettingsDialog
      bots={bots}
      room={room}
      onOpenChange={handleOpenChange}
      onSaved={navigate}
    />
  );
}
