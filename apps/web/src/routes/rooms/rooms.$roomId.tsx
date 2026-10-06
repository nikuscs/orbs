import { ORPCError } from '@orpc/client';
import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';
import { RoomsPage } from '@/components/rooms/rooms-page';
import { rpc } from '@/services/rpc/rpc.client';
import type { TenantRoomSummary } from '@orbs/server/client';

export const Route = createFileRoute('/_chat/rooms/$roomId')({
  loader: async ({ context, params }) => {
    let rooms: TenantRoomSummary[];

    try {
      [rooms] = await Promise.all([
        context.queryClient.ensureQueryData(rpc.rooms.list.queryOptions()),
        context.queryClient.fetchQuery(rpc.rooms.timeline.queryOptions({ input: { roomId: params.roomId } })),
      ]);
    } catch (error) {
      if (error instanceof ORPCError && error.code === 'NOT_FOUND') {
        throw notFound();
      }

      throw error;
    }

    const room = rooms.find((item) => item.id === params.roomId);

    if (!room) {
      throw notFound();
    }
  },
  component: RoomRoute,
});

function RoomRoute() {
  return (
    <>
      <RoomsPage roomId={Route.useParams().roomId} />
      <Outlet />
    </>
  );
}
