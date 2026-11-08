import { useMutation } from '@tanstack/react-query';
import { useRpc } from './use-rpc';

export function useBotAvatarGenerate() {
  const { rpc } = useRpc();

  return useMutation(rpc.avatars.generate.mutationOptions());
}
