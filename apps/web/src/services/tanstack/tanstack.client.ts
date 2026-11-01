import { connectionLostReason } from '@repo/client/client';
import { chatAttachmentUrlRelease, queryMutationCache } from '@repo/client/react';
import { log } from '@repo/logger/client';
import { toasty } from '@repo/ui/sonner';
import { isCancelledError, QueryCache, QueryClient } from '@tanstack/react-query';
import { match, P } from 'ts-pattern';
import { connectionLost } from '@/services/connection/connection.client';

export function tanstackQueryContext() {
  const tanstackConnectionError = (error: Error) => match(connectionLostReason(error))
    .with(P.nonNullable, (reason) => void connectionLost(reason))
    .otherwise(() => undefined);

  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: tanstackConnectionError }),
    mutationCache: queryMutationCache({
      notify: ({ message, variant }) => toasty(message, variant === 'error' ? '⚠️' : '✅'),
      onError: (error) => {
        tanstackConnectionError(error);

        if (!isCancelledError(error)) {
          log.error({ action: 'mutation_error', error });
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });

  chatAttachmentUrlRelease(queryClient);

  return { queryClient };
}
