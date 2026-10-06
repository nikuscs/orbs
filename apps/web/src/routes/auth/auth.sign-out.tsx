import { createFileRoute } from '@tanstack/react-router';
import { AuthSignOut } from '@/components/auth/auth-sign-out';

export const Route = createFileRoute('/rooms/sign-out')({
  preload: false,
  component: AuthSignOut,
});
