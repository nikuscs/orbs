import { resolveIntendedUrl } from '@orbs/tanstack-helpers/universal';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { AuthLayout } from '@/components/auth/auth-layout';
import { authLayoutSearch } from '@orbs/server/client';

export const Route = createFileRoute('/auth')({
  validateSearch: authLayoutSearch,
  beforeLoad: ({ context, location, search }) => {
    if (context.user) {
      throw redirect({ href: resolveIntendedUrl({ intended: search.redirectTo ?? null, fallback: '/rooms' }) });
    }

    if (location.pathname === '/auth') {
      throw redirect({ to: '/auth/sign-in' });
    }
  },
  component: AuthLayoutRoute,
});

function AuthLayoutRoute() {
  return <AuthLayout search={Route.useSearch()} />;
}
