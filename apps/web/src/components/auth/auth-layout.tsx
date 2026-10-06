import { m } from '@orbs/i18n/client';
import { Link, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toasty } from '@/components/ui/sonner';
import IconArrowLeft from '~icons/lucide/arrow-left';
import IconLock from '~icons/lucide/lock';
import type { AuthLayoutSearch } from '@orbs/server/client';

export function AuthLayout({ search }: { search: AuthLayoutSearch }) {
  const hasAuthError = Boolean(search.error ?? search.error_description);

  useEffect(() => {
    if (hasAuthError) {
      toasty(m.auth_sign_in_failed(), '🔴', { id: 'auth' });
    }
  }, [hasAuthError]);

  return (
    <div className="flex-center min-h-svh flex-col bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="mb-3 flex justify-center">
          <Button
            asChild
            size="xs"
            variant="link"
          >
            <Link to="/">
              <IconArrowLeft className="size-3" />
              {m.auth_back_to_website()}
            </Link>
          </Button>
        </div>
        <Outlet />
        <p className="mx-auto mt-4 max-w-full text-center text-xxs leading-none text-muted-foreground md:truncate">
          <IconLock className="mr-1 inline size-2.5 align-[-1px] text-muted-foreground" />
          <span className="md:truncate">{m.auth_privacy_proof({ name: 'Orbs' })}</span>
        </p>
      </div>
    </div>
  );
}
