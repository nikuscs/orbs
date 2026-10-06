import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { BotFormDialog } from '@/components/bots/bot-form-dialog';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';
import { rpc } from '@/services/rpc/rpc.client';

export const Route = createFileRoute('/_chat/rooms/direct/$handle/edit')({
  loader: async ({ context, params }) => {
    const bots = await context.queryClient.ensureQueryData(rpc.bots.list.queryOptions());
    const bot = bots.find((item) => item.handle === params.handle);

    if (!bot) {
      throw notFound();
    }

    return { bot };
  },
  component: DirectBotEditRoute,
});

function DirectBotEditRoute() {
  const { handle } = Route.useParams();
  const navigate = useNavigate();
  const { handleOpenChange } = useDialogNavigation({ to: '/rooms/direct/$handle', params: { handle } });

  return (
    <BotFormDialog
      bot={Route.useLoaderData().bot}
      onOpenChange={handleOpenChange}
      onSaved={(saved) => void navigate({ to: '/rooms/direct/$handle', params: { handle: saved.handle } })}
    />
  );
}
