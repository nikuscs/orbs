import { useQuery } from '@tanstack/react-query';
import { AVATAR_GENERATOR } from '../services/avatar/avatar.constants';
import { useRpc } from './use-rpc';

export function useAvatarGenerator() {
  const { rpc } = useRpc();

  const generator = useQuery({
    ...rpc.avatars.generator.queryOptions(),
    staleTime: AVATAR_GENERATOR.staleMs,
    refetchOnWindowFocus: true,
  });

  const model = generator.data?.model ?? null;

  return { isAvailable: model !== null, model };
}
