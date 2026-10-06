import { createFileRoute, notFound } from '@tanstack/react-router';
import { MemoryWipeDialog } from '@/components/memory/memory-wipe-dialog';
import { RoomsPage } from '@/components/rooms/rooms-page';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';
import { rpc } from '@/services/rpc/rpc.client';

export const Route = createFileRoute('/_chat/bots/$botId/wipe-memory')({
  loader: async ({ context, params }) => {
    const bots = await context.queryClient.ensureQueryData(rpc.bots.list.queryOptions());
    const bot = bots.find((item) => item.id === params.botId);

    if (!bot) {
      throw notFound();
    }

    return { bot };
  },
  component: BotWipeMemoryRoute,
});

function BotWipeMemoryRoute() {
  const { bot } = Route.useLoaderData();
  const { handleOpenChange } = useDialogNavigation({ to: '/bots/$botId/edit', params: { botId: bot.id } });
  return (
    <><RoomsPage /><MemoryWipeDialog
      name={bot.name}
      scope={{ scope: 'bot', ownerId: bot.id }}
      onOpenChange={handleOpenChange}
    /></>
  );
}
