import { m } from '@repo/i18n/client';
import { useMutation } from '@tanstack/react-query';
import { useRpc } from './use-rpc';
import type { SettingsDoneParams } from '../types/settings.types';

export function useSettingsProviderLogout({ onDone }: SettingsDoneParams) {
  const { rpc } = useRpc();

  const logout = useMutation(rpc.providers.logout.mutationOptions({
    meta: { invalidates: [rpc.providers.list.key(), rpc.avatars.generator.key()] },
    onSuccess: () => onDone(),
  }));

  return {
    isPending: logout.isPending,
    problem: logout.isError ? m.settings_providers_error() : null,
    logout: (providerId: string) => logout.mutate({ providerId }),
    reset: logout.reset,
  };
}
