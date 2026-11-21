import { m } from '@repo/i18n/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { SETTINGS } from '../services/settings/settings.constants';
import { useRpc } from './use-rpc';
import type { ProviderSession } from '@repo/contracts/universal';

export function useSettingsProviderSession(started: ProviderSession) {
  const queryClient = useQueryClient();
  const { rpc } = useRpc();
  const [answer, setAnswer] = useState('');

  const { data: session } = useQuery({
    ...rpc.providers.session.queryOptions({ input: { id: started.id } }),
    initialData: started,
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? SETTINGS.providerPollMs : false),
  });

  const complete = useMutation(rpc.providers.complete.mutationOptions({ onSuccess: () => setAnswer('') }));
  const cancel = useMutation(rpc.providers.cancel.mutationOptions());
  const isPending = session.status === 'pending';

  useEffect(() => {
    if (isPending) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: rpc.providers.list.key() });
    void queryClient.invalidateQueries({ queryKey: rpc.models.list.key() });
    void queryClient.invalidateQueries({ queryKey: rpc.avatars.generator.key() });
  }, [isPending, queryClient, rpc]);

  return {
    session,
    isPending,
    answer,
    setAnswer,
    isAnswering: complete.isPending,
    isCancelling: cancel.isPending,
    problem: session.error ?? (complete.isError ? m.settings_providers_error() : null),
    reply: (value: string) => session.prompt && complete.mutate({
      id: session.id,
      promptId: session.prompt.id,
      answer: value,
    }),
    cancel: () => cancel.mutate({ id: session.id }),
  };
}
