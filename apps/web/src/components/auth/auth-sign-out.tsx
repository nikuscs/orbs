import { m } from '@orbs/i18n/client';
import { useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { auth } from '@/services/auth/auth.client';

export function AuthSignOut() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      try {
        await auth.signOut();
      } finally {
        await router.navigate({ to: '/', reloadDocument: true });
      }
    })();
  }, [router]);

  return (
    <div className="flex-center min-h-screen">
      <p className="text-muted-foreground">{m.auth_signing_out()}</p>
    </div>
  );
}
