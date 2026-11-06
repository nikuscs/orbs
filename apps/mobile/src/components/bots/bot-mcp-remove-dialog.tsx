import { useBotMcpRemove } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { match, P } from 'ts-pattern';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useConnection } from '@/hooks/use-connection';
import type { RpcSession } from '@/types/rpc.types';

interface BotMcpRemoveDialogProps {
  botId: string;
  server: string;
}

export function BotMcpRemoveDialog(params: BotMcpRemoveDialogProps) {
  const { session } = useConnection();

  return match(session)
    .with(P.nonNullable, (current) => <BotMcpRemoveDialogContent params={params} session={current} />)
    .otherwise(() => null);
}

interface BotMcpRemoveDialogContentProps {
  session: RpcSession;
  params: BotMcpRemoveDialogProps;
}

function BotMcpRemoveDialogContent({ session, params: { botId, server } }: BotMcpRemoveDialogContentProps) {
  const router = useRouter();
  const bots = useQuery(session.rpc.bots.list.queryOptions());
  const bot = bots.data?.find((item) => item.id === botId)?.name ?? '';
  const remove = useBotMcpRemove({ onDone: () => router.back() });

  return (
    <ConfirmDialog
      isDestructive
      confirmLabel={m.bots_mcp_remove()}
      description={m.bots_mcp_remove_description({ bot, server })}
      error={remove.problem}
      isPending={remove.isPending}
      title={m.bots_mcp_remove_title({ server })}
      onCancel={() => router.back()}
      onConfirm={() => remove.remove(botId, server)}
    />
  );
}
