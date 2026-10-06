import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { rpc } from '@/services/rpc/rpc.client';

export function useRoomsRefresh() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const includeInactiveQueries = 'all' as const;

  return async () => {
    await queryClient.refetchQueries({ queryKey: rpc.rooms.list.key(), type: includeInactiveQueries });
    await router.invalidate({ filter: (match) => match.routeId === '/_chat' });
  };
}
