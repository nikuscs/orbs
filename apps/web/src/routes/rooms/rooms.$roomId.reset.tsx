import { createFileRoute, notFound } from '@tanstack/react-router';
import { RoomsResetDialog } from '@/components/rooms/rooms-reset-dialog';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';
import { rpc } from '@/services/rpc/rpc.client';

export const Route = createFileRoute('/_chat/rooms/$roomId/reset')({
  loader: async ({ context, params }) => {
    const [rooms, bots] = await Promise.all([
      context.queryClient.ensureQueryData(rpc.rooms.list.queryOptions()),
      context.queryClient.ensureQueryData(rpc.bots.list.queryOptions()),
    ]);

    const room = rooms.find((item) => item.id === params.roomId);

    if (!room) {
      throw notFound();
    }

    return { members: bots.filter((bot) => room.botIds.includes(bot.id)) };
  },
  component: RoomResetRoute,
});

function RoomResetRoute() {
  const { roomId } = Route.useParams();
  const { handleOpenChange } = useDialogNavigation({ to: '/rooms/$roomId', params: { roomId } });

  return (
    <RoomsResetDialog
      bots={Route.useLoaderData().members}
      roomId={roomId}
      onOpenChange={handleOpenChange}
    />
  );
}
