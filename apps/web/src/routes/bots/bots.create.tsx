import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { BotFormDialog } from '@/components/bots/bot-form-dialog';
import { RoomsPage } from '@/components/rooms/rooms-page';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';
import { botDefaultSettings } from '@/services/bot/bot.client';
import { rpc } from '@/services/rpc/rpc.client';

export const Route = createFileRoute('/_chat/bots/create')({
  loader: async ({ context }) => {
    const harnesses = await context.queryClient.ensureQueryData(rpc.bots.harnesses.queryOptions());
    const harnessId = harnesses.at(0)?.harnessId;

    if (!harnessId) {
      return { settings: null };
    }

    const providers = await context.queryClient.ensureQueryData(rpc.bots.models.queryOptions({ input: { harnessId } }));

    return { settings: botDefaultSettings({
      harnessId,
      providers,
      thinkingLevel: 'medium',
    }) };
  },
  component: BotCreateRoute,
});

function BotCreateRoute() {
  const { settings } = Route.useLoaderData();
  const navigate = useNavigate();
  const { handleOpenChange } = useDialogNavigation({ to: '/rooms' });

  return (
    <>
      <RoomsPage />
      <BotFormDialog
        settings={settings}
        onOpenChange={handleOpenChange}
        onSaved={(bot) => void navigate({ to: '/rooms/direct/$handle', params: { handle: bot.handle } })}
      />
    </>
  );
}
