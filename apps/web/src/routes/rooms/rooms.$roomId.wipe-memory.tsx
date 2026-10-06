import { createFileRoute, notFound } from '@tanstack/react-router';
import { MemoryWipeDialog } from '@/components/memory/memory-wipe-dialog';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';
import { rpc } from '@/services/rpc/rpc.client';
import { memoryWipeSearch } from '@orbs/server/client';

export const Route = createFileRoute('/_chat/rooms/$roomId/wipe-memory')({
  validateSearch: memoryWipeSearch,
  loader: async ({ context, params }) => {
    const rooms = await context.queryClient.ensureQueryData(rpc.rooms.list.queryOptions());
    const room = rooms.find((item) => item.id === params.roomId);

    if (!room) {
      throw notFound();
    }

    return { room };
  },
  component: RoomWipeMemoryRoute,
});

function RoomWipeMemoryRoute() {
  const { room } = Route.useLoaderData();
  const { handleOpenChange } = useDialogNavigation({ to: Route.useSearch().from === 'room' ? '/rooms/$roomId' : '/rooms/$roomId/settings', params: { roomId: room.id } });
  return (
    <MemoryWipeDialog
      name={room.name}
      scope={{ scope: 'room', ownerId: room.id }}
      onOpenChange={handleOpenChange}
    />
  );
}
