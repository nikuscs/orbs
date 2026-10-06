import { m } from '@orbs/i18n/client';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { AuthFormResetPassword } from '@/components/auth/auth-form-reset-password';
import { LayoutAuthCard } from '@/components/layout/layout-auth-card';
import { authResetPasswordSearch } from '@orbs/server/client';

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: authResetPasswordSearch,
  beforeLoad: ({ search }) => {
    if (!search.token) {
      throw redirect({ to: '/auth/sign-in' });
    }
  },
  head: () => ({
    meta: [
      { title: m.auth_reset_password_title() },
      { name: 'description', content: m.auth_reset_password_seo_description() },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();

  if (!token) {
    return null;
  }

  return (
    <LayoutAuthCard
      description={m.auth_reset_password_description()}
      footer={(
        <>
          {m.auth_remember_password()}{' '}
          <Link className="underline underline-offset-4 hover:text-primary" to="/auth/sign-in">{m.auth_sign_in()}</Link>
        </>
      )}
      title={m.auth_reset_password_title()}
    >
      <AuthFormResetPassword token={token} />
    </LayoutAuthCard>
  );
}
