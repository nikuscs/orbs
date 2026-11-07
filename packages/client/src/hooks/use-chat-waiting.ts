import { useQuery } from '@tanstack/react-query';
import { chatQueries } from '../services/chat/chat.client';
import { useRpc } from './use-rpc';

export function useChatWaiting(botId: string) {
  const rpcs = useRpc();

  const { data: isWaiting = false } = useQuery({
    ...chatQueries.notifications(rpcs),
    select: (state) => state?.pending.some((item) => item.botId === botId) ?? false,
  });

  return isWaiting;
}
