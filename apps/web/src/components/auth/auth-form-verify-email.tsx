import { m } from '@orbs/i18n/client';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonLoading } from '@/components/ui/button-loading';
import { toasty } from '@/components/ui/sonner';
import { auth } from '@/services/auth/auth.client';

export function AuthFormVerifyEmail() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/auth/verify-email' });
  const [isResending, setIsResending] = useState(false);
  const email = search.email;

  async function handleResend() {
    if (!email) {
      return;
    }

    setIsResending(true);
    try {
      const result = await auth.sendVerificationEmail({ email, callbackURL: '/rooms' });

      if (result.error) {
        toasty(m.auth_resend_verification_failed(), '🔴', { id: 'auth' });
      } else {
        toasty(m.auth_verification_email_sent(), '✅', { id: 'auth' });
      }
    } catch {
      toasty(m.auth_resend_email_failed(), '🔴', { id: 'auth' });
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="grid gap-4">
      <p className="mx-auto max-w-md text-center text-xs text-muted-foreground">{m.auth_verify_email_instructions()}</p>
      <div className="flex flex-col gap-2">
        <ButtonLoading
          className="w-full"
          disabled={!email}
          loading={isResending}
          onClick={handleResend}
        >
          {m.auth_resend_verification_email()}
        </ButtonLoading>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => navigate({ to: '/auth/sign-in' })}
        >
          <ArrowLeftIcon className="size-4" />
          {m.auth_back_to_sign_in()}
        </Button>
      </div>
    </div>
  );
}
