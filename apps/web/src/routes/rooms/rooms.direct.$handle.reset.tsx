import { createFileRoute, notFound, useLoaderData } from '@tanstack/react-router';
import { RoomsResetDialog } from '@/components/rooms/rooms-reset-dialog';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';
import { rpc } from '@/services/rpc/rpc.client';

export const Route = createFileRoute('/_chat/rooms/direct/$handle/reset')({
  loader: async ({ context, params }) => {
    const bots = await context.queryClient.ensureQueryData(rpc.bots.list.queryOptions());
    const bot = bots.find((item) => item.handle === params.handle);

    if (!bot) {
      throw notFound();
    }

    return { bot };
  },
  component: DirectBotResetRoute,
});

function DirectBotResetRoute() {
  const { handle } = Route.useParams();
  const { roomId } = useLoaderData({ from: '/_chat/rooms/direct/$handle' });
  const { handleOpenChange } = useDialogNavigation({ to: '/rooms/direct/$handle', params: { handle } });

  return (
    <RoomsResetDialog
      bots={[Route.useLoaderData().bot]}
      roomId={roomId}
      onOpenChange={handleOpenChange}
    />
  );
}
