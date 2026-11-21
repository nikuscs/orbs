import { createFileRoute } from '@tanstack/react-router';
import { RoomsComputerShutdownDialog } from '@/components/rooms/rooms-computer-shutdown-dialog';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';
import { roomsDirectBot } from '@/services/rooms/rooms.client';

export const Route = createFileRoute('/_chat/rooms/direct/$handle/computer/shutdown')({
  loader: async ({ context, params }) => ({ bot: await roomsDirectBot(context.queryClient, params) }),
  component: DirectComputerShutdownRoute,
});

function DirectComputerShutdownRoute() {
  const { handle } = Route.useParams();
  const { bot } = Route.useLoaderData();
  const { handleOpenChange } = useDialogNavigation({ to: '/rooms/direct/$handle/computer', params: { handle } });

  return <RoomsComputerShutdownDialog bot={bot} onOpenChange={handleOpenChange} />;
}
