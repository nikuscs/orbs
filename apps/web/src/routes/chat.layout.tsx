import { m } from '@orbs/i18n/client';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { LayoutShellDashboard } from '@/components/layout/layout-shell-dashboard';
import { RoomsDetails } from '@/components/rooms/rooms-details';
import { useRoomsSync } from '@/hooks/use-rooms-sync';
import { rpc } from '@/services/rpc/rpc.client';

export const Route = createFileRoute('/_chat')({
  head: () => ({
    meta: [{ title: m.rooms_meta_title() }, { name: 'robots', content: 'noindex, nofollow' }],
  }),
  beforeLoad: ({ context, location }) => {
    if (!context.user || !context.organization) {
      throw redirect({ to: '/auth/sign-in', search: { redirectTo: location.href } });
    }
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(rpc.rooms.list.queryOptions()),
      context.queryClient.ensureQueryData(rpc.bots.list.queryOptions()),
    ]);
  },
  component: RoomsLayout,
});

function RoomsLayout() {
  useRoomsSync();

  return (
    <LayoutShellDashboard aside={<RoomsDetails />}>
      <Outlet />
    </LayoutShellDashboard>
  );
}
