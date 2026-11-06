import { m } from '@repo/i18n/client';
import { useMutation } from '@tanstack/react-query';
import { useRpc } from './use-rpc';
import type { BotMcpRemoveParams } from '../types/bot.types';

export function useBotMcpRemove({ onDone }: BotMcpRemoveParams) {
  const { rpc } = useRpc();
  const remove = useMutation(rpc.mcp.remove.mutationOptions({ meta: { invalidates: [rpc.mcp.discover.key()] }, onSuccess: () => onDone() }));

  return {
    isPending: remove.isPending,
    problem: remove.isError ? m.bots_mcp_remove_failed() : null,
    remove: (botId: string, name: string) => remove.mutate({ botId, name }),
  };
}
