import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';
import { RoomsPage } from '@/components/rooms/rooms-page';
import { rpc } from '@/services/rpc/rpc.client';

export const Route = createFileRoute('/_chat/rooms/direct/$handle')({
  loader: async ({ context, params }) => {
    const [bots, rooms] = await Promise.all([
      context.queryClient.ensureQueryData(rpc.bots.list.queryOptions()),
      context.queryClient.ensureQueryData(rpc.rooms.list.queryOptions()),
    ]);

    const bot = bots.find((item) => item.handle === params.handle);

    if (!bot) {
      throw notFound();
    }

    const existing = rooms.find((room) => room.kind === 'direct' && room.botIds.includes(bot.id));

    if (existing) {
      await context.queryClient.fetchQuery(rpc.rooms.timeline.queryOptions({ input: { roomId: existing.id } }));

      return { roomId: existing.id };
    }

    const room = await rpc.rooms.openDirect.call({ botId: bot.id });
    await Promise.all([
      context.queryClient.invalidateQueries({ queryKey: rpc.rooms.list.key() }),
      context.queryClient.fetchQuery(rpc.rooms.timeline.queryOptions({ input: { roomId: room.id } })),
    ]);

    return { roomId: room.id };
  },
  component: DirectRoomRoute,
});

function DirectRoomRoute() {
  return (
    <>
      <RoomsPage roomId={Route.useLoaderData().roomId} />
      <Outlet />
    </>
  );
}
