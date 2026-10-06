import { m } from '@orbs/i18n/client';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AuthFormForgotPassword } from '@/components/auth/auth-form-forgot-password';
import { LayoutAuthCard } from '@/components/layout/layout-auth-card';

export const Route = createFileRoute('/auth/forgot-password')({
  head: () => ({
    meta: [
      { title: m.auth_forgot_password_title() },
      { name: 'description', content: m.auth_forgot_password_seo_description() },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <LayoutAuthCard
      description={m.auth_forgot_password_description()}
      footer={(
        <>
          {m.auth_remember_password()}{' '}
          <Link className="underline underline-offset-4 hover:text-primary" to="/auth/sign-in">{m.auth_sign_in()}</Link>
        </>
      )}
      title={m.auth_forgot_password_title()}
    >
      <AuthFormForgotPassword />
    </LayoutAuthCard>
  );
}
