import { m } from '@orbs/i18n/client';
import { createFileRoute } from '@tanstack/react-router';
import { AuthFormVerifyEmail } from '@/components/auth/auth-form-verify-email';
import { LayoutAuthCard } from '@/components/layout/layout-auth-card';
import { authVerifyEmailSearch } from '@orbs/server/client';

export const Route = createFileRoute('/auth/verify-email')({
  validateSearch: authVerifyEmailSearch,
  head: () => ({
    meta: [
      { title: m.auth_verify_email_title() },
      { name: 'description', content: m.auth_verify_email_seo_description() },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  return (
    <LayoutAuthCard description={m.auth_verify_email_description()} title={m.auth_verify_email_title()}>
      <AuthFormVerifyEmail />
    </LayoutAuthCard>
  );
}
