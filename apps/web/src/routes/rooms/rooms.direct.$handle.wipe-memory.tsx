import { createFileRoute, notFound, useLoaderData } from '@tanstack/react-router';
import { MemoryWipeDialog } from '@/components/memory/memory-wipe-dialog';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';
import { rpc } from '@/services/rpc/rpc.client';

export const Route = createFileRoute('/_chat/rooms/direct/$handle/wipe-memory')({
  loader: async ({ context, params }) => {
    const bots = await context.queryClient.ensureQueryData(rpc.bots.list.queryOptions());
    const bot = bots.find((item) => item.handle === params.handle);

    if (!bot) {
      throw notFound();
    }

    return { bot };
  },
  component: DirectMemoryWipeRoute,
});

function DirectMemoryWipeRoute() {
  const { handle } = Route.useParams();
  const { roomId } = useLoaderData({ from: '/_chat/rooms/direct/$handle' });
  const { handleOpenChange } = useDialogNavigation({ to: '/rooms/direct/$handle', params: { handle } });

  return (
    <MemoryWipeDialog
      name={Route.useLoaderData().bot.name}
      scope={{ scope: 'room', ownerId: roomId }}
      onOpenChange={handleOpenChange}
    />
  );
}
