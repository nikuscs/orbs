import { m } from '@orbs/i18n/client';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { AvatarStudio } from '@/components/avatars/avatar-studio';
import { LayoutShellDashboard } from '@/components/layout/layout-shell-dashboard';

export const Route = createFileRoute('/lab/avatars')({
  head: () => ({
    meta: [{ title: m.avatars_meta_title() }, { name: 'robots', content: 'noindex, nofollow' }],
  }),
  beforeLoad: ({ context, location }) => {
    if (!context.user || !context.organization) {
      throw redirect({ to: '/auth/sign-in', search: { redirectTo: location.href } });
    }
  },
  loader: () => ({ breadcrumb: [{ label: m.avatars_breadcrumb() }] }),
  component: LabAvatarsRoute,
});

function LabAvatarsRoute() {
  return (
    <LayoutShellDashboard>
      <AvatarStudio />
    </LayoutShellDashboard>
  );
}
