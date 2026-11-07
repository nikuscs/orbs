import { createFileRoute, Outlet } from '@tanstack/react-router';
import { RoomsComputerView } from '@/components/rooms/rooms-computer-view';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';
import { roomsDirectBot } from '@/services/rooms/rooms.client';

export const Route = createFileRoute('/_chat/rooms/direct/$handle/computer')({
  loader: async ({ context, params }) => ({ bot: await roomsDirectBot(context.queryClient, params) }),
  component: DirectComputerRoute,
});

function DirectComputerRoute() {
  const { handle } = Route.useParams();
  const { bot } = Route.useLoaderData();
  const { handleOpenChange } = useDialogNavigation({ to: '/rooms/direct/$handle', params: { handle } });

  return (
    <>
      <RoomsComputerView bot={bot} onOpenChange={handleOpenChange} />
      <Outlet />
    </>
  );
}
