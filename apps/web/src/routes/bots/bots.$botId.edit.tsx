import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { BotFormDialog } from '@/components/bots/bot-form-dialog';
import { RoomsPage } from '@/components/rooms/rooms-page';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';
import { rpc } from '@/services/rpc/rpc.client';

export const Route = createFileRoute('/_chat/bots/$botId/edit')({
  loader: async ({ context, params }) => {
    const bots = await context.queryClient.ensureQueryData(rpc.bots.list.queryOptions());
    const bot = bots.find((item) => item.id === params.botId);

    if (!bot) {
      throw notFound();
    }

    const room = await rpc.rooms.openDirect.call({ botId: bot.id });
    await Promise.all([
      context.queryClient.invalidateQueries({ queryKey: rpc.rooms.list.key() }),
      context.queryClient.ensureQueryData(rpc.rooms.timeline.queryOptions({ input: { roomId: room.id } })),
    ]);

    return { bot, roomId: room.id };
  },
  component: BotEditRoute,
});

function BotEditRoute() {
  const { bot, roomId } = Route.useLoaderData();
  const navigate = useNavigate();
  const { handleOpenChange } = useDialogNavigation({ to: '/rooms/direct/$handle', params: { handle: bot.handle } });

  return (
    <>
      <RoomsPage roomId={roomId} />
      <BotFormDialog
        bot={bot}
        onOpenChange={handleOpenChange}
        onSaved={(saved) => void navigate({ to: '/rooms/direct/$handle', params: { handle: saved.handle } })}
      />
    </>
  );
}
