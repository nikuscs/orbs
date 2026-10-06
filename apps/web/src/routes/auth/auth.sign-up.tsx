import { m } from '@orbs/i18n/client';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AuthFormSignup } from '@/components/auth/auth-form-signup';
import { LayoutAuthCard } from '@/components/layout/layout-auth-card';
import { authSignUpSearch } from '@orbs/server/client';

export const Route = createFileRoute('/auth/sign-up')({
  validateSearch: authSignUpSearch,
  head: () => ({
    meta: [
      { title: m.auth_sign_up_title() },
      { name: 'description', content: m.auth_sign_up_seo_description() },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const search = Route.useSearch();

  return (
    <LayoutAuthCard
      description={m.auth_sign_up_description()}
      footer={(
        <>
          {m.auth_has_account()}{' '}
          <Link className="underline underline-offset-4 hover:text-primary" to="/auth/sign-in">{m.auth_sign_in()}</Link>
        </>
      )}
      title={m.auth_sign_up_title()}
    >
      <AuthFormSignup email={search.email} intended={search.intended} />
    </LayoutAuthCard>
  );
}
