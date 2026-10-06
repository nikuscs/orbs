import { createFileRoute } from '@tanstack/react-router';
import { RoomsPage } from '@/components/rooms/rooms-page';
import { SettingsOrganizationDialog } from '@/components/settings/settings-organization-dialog';
import { useDialogNavigation } from '@/hooks/use-dialog-navigation';
import { rpc } from '@/services/rpc/rpc.client';

export const Route = createFileRoute('/_chat/settings/organization')({
  loader: ({ context }) => context.queryClient.ensureQueryData(rpc.organization.settings.queryOptions()),
  component: SettingsOrganizationRoute,
});

function SettingsOrganizationRoute() {
  const { handleOpenChange, navigate } = useDialogNavigation({ to: '/rooms' });

  return (
    <>
      <RoomsPage />
      <SettingsOrganizationDialog
        settings={Route.useLoaderData()}
        onOpenChange={handleOpenChange}
        onSaved={navigate}
      />
    </>
  );
}
