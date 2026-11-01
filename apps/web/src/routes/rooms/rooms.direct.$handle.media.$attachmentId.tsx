import { useChatViewer } from '@repo/client/react';
import { attachmentView } from '@repo/contracts/universal';
import { RoomsChatViewer } from '@repo/ui/rooms/rooms-chat-viewer';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';
import { roomsDirectBot } from '@/services/rooms/rooms.client';

export const Route = createFileRoute('/_chat/rooms/direct/$handle/media/$attachmentId')({
  validateSearch: attachmentView,
  loader: async ({ context, params }) => ({ bot: await roomsDirectBot(context.queryClient, params) }),
  component: DirectMediaViewerRoute,
});

function DirectMediaViewerRoute() {
  const { handle, attachmentId } = Route.useParams();
  const { entryId } = Route.useSearch();
  const { bot } = Route.useLoaderData();
  const navigateTo = useNavigate();
  const { navigate } = useDialogNavigation({ to: '/rooms/direct/$handle', params: { handle } });

  const viewer = useChatViewer({
    bot,
    entryId,
    attachmentId,
  });

  return (
    <RoomsChatViewer
      botId={bot.id}
      caption={viewer.caption}
      images={viewer.images}
      index={viewer.index}
      onClose={navigate}
      onIndexChange={(index) => {
        const next = viewer.images[index]?.url.split(':').at(-1);

        if (next) {
          void navigateTo({
            to: '/rooms/direct/$handle/media/$attachmentId',
            params: { handle, attachmentId: next },
            search: { entryId },
            replace: true,
            resetScroll: false,
          });
        }
      }}
    />
  );
}
