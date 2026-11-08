import { m } from '@repo/i18n/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { match } from 'ts-pattern';
import { SETTINGS } from '../services/settings/settings.constants';
import { useRpc } from './use-rpc';
import type { SettingsProviderStatus } from '../types/settings.types';
import type { Provider, ProviderAuthType, ProviderSession } from '@repo/contracts/universal';

export function useSettingsProviders() {
  const { rpc } = useRpc();
  const list = useQuery(rpc.providers.list.queryOptions());
  const [started, setStarted] = useState<ProviderSession | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const login = useMutation(rpc.providers.login.mutationOptions({
    meta: { invalidates: [rpc.providers.list.key()] },
    onSuccess: setStarted,
  }));

  const saved = list.data?.session ?? null;
  const latest = started && saved?.id !== started.id ? started : saved;

  const rank = (provider: Provider) => {
    const index = SETTINGS.featuredProviders.findIndex((id) => id === provider.id);

    return index === -1 ? SETTINGS.featuredProviders.length : index;
  };

  const providers = [...(list.data?.providers ?? [])]
    .filter((provider) => provider.id !== 'openai-codex')
    .sort((a, b) => rank(a) - rank(b));

  const available = providers.filter((provider) => !provider.isConfigured && (provider.authTypes.length > 0 || provider.loginCommand !== undefined));

  const session = latest && latest.id !== dismissedId && (latest.status === 'pending' || latest.status === 'failed') ? latest : null;

  const status = (provider: Provider): SettingsProviderStatus => match({
    isConfigured: provider.isConfigured,
    session: session?.providerId === provider.id ? session.status : null,
  })
    .with({ session: 'pending' }, () => ({ tone: 'warning' as const, label: m.settings_providers_signing_in() }))
    .with({ session: 'failed' }, () => ({ tone: 'destructive' as const, label: m.settings_providers_failed() }))
    .with({ isConfigured: true }, () => ({ tone: 'success' as const, label: m.settings_providers_connected() }))
    .otherwise(() => ({ tone: 'default' as const, label: m.settings_providers_disconnected() }));

  return {
    list,
    session,
    status,
    connected: providers.filter((provider) => provider.isConfigured),
    available,
    featured: providers.filter((provider) => rank(provider) < SETTINGS.featuredProviders.length),
    isBusy: login.isPending || list.data?.session?.status === 'pending',
    problem: login.isError ? m.settings_providers_error() : null,
    login: (providerId: string, authType: ProviderAuthType) => login.mutate({ providerId, authType }),
    dismiss: (sessionId: string) => {
      setDismissedId(sessionId);
      setStarted(null);
    },
  };
}
