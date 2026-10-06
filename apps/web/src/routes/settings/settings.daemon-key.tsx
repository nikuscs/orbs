import { createFileRoute } from '@tanstack/react-router';
import { RoomsPage } from '@/components/rooms/rooms-page';
import { SettingsDaemonKeyDialog } from '@/components/settings/settings-daemon-key-dialog';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';

export const Route = createFileRoute('/_chat/settings/daemon-key')({
  component: SettingsDaemonKeyRoute,
});

function SettingsDaemonKeyRoute() {
  const { handleOpenChange } = useDialogNavigation({ to: '/rooms' });

  return (
    <>
      <RoomsPage />
      <SettingsDaemonKeyDialog onOpenChange={handleOpenChange} />
    </>
  );
}
