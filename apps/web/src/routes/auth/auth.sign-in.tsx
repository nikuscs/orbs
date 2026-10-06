import { m } from '@orbs/i18n/client';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AuthFormLogin } from '@/components/auth/auth-form-login';
import { LayoutAuthCard } from '@/components/layout/layout-auth-card';

export const Route = createFileRoute('/auth/sign-in')({
  head: () => ({
    meta: [
      { title: m.auth_sign_in() },
      { name: 'description', content: m.auth_sign_in_seo_description() },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  return (
    <LayoutAuthCard
      description={m.auth_sign_in_title({ name: 'Orbs' })}
      footer={(
        <>
          {m.auth_no_account()}{' '}
          <Link className="underline underline-offset-4 hover:text-primary" to="/auth/sign-up">{m.auth_sign_up()}</Link>
        </>
      )}
      title={m.auth_sign_in()}
    >
      <AuthFormLogin />
    </LayoutAuthCard>
  );
}
