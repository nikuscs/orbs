import { createFileRoute, notFound, redirect, useNavigate } from '@tanstack/react-router';
import { BotDeleteDialog } from '@/components/bots/bot-delete-dialog';
import { RoomsPage } from '@/components/rooms/rooms-page';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';
import { rpc } from '@/services/rpc/rpc.client';

export const Route = createFileRoute('/_chat/bots/$botId/delete')({
  loader: async ({ context, params }) => {
    const bots = await context.queryClient.ensureQueryData(rpc.bots.list.queryOptions());
    const bot = bots.find((item) => item.id === params.botId);

    if (!bot) {
      throw notFound();
    }

    if (bots.length <= 1) {
      throw redirect({ to: '/bots/$botId/edit', params });
    }

    return { bot };
  },
  component: BotDeleteRoute,
});

function BotDeleteRoute() {
  const { bot } = Route.useLoaderData();
  const navigate = useNavigate();
  const { handleOpenChange } = useDialogNavigation({ to: '/bots/$botId/edit', params: { botId: bot.id } });

  return (
    <>
      <RoomsPage />
      <BotDeleteDialog
        bot={bot}
        onDeleted={() => navigate({ to: '/rooms' })}
        onOpenChange={handleOpenChange}
      />
    </>
  );
}
