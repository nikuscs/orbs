import { botSection } from '@repo/contracts/universal';
import { m } from '@repo/i18n/client';
import { LayoutNotFound } from '@repo/ui/layout/layout-error';
import { createFileRoute, useMatches, useParams } from '@tanstack/react-router';
import { match } from 'ts-pattern';
import { BotDialog } from '@/components/bots/bot-dialog';
import { useSectionDialogClose } from '@/hooks/use-section-dialog-close';
import { rpc } from '@/services/rpc/rpc.client';
import { seoHead } from '@/services/seo/seo.utils';
import type { BotDialogView } from '@/types/bot.types';

export const Route = createFileRoute('/_chat/bots')({
  head: () => seoHead({ title: m.bots_title() }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(rpc.bots.list.queryOptions()),
      context.queryClient.prefetchQuery(rpc.models.list.queryOptions()),
      context.queryClient.prefetchQuery(rpc.providers.list.queryOptions()),
    ]);

    return { breadcrumb: m.bots_title() };
  },
  component: BotsRoute,
  notFoundComponent: LayoutNotFound,
});

function BotsRoute() {
  const routeId = useMatches({ select: (matches) => matches.at(-1)?.routeId });
  const { botId = '', tab, routineId = '', todoId = '', server = '' } = useParams({ strict: false });
  const close = useSectionDialogClose();

  const view = match(routeId)
    .returnType<BotDialogView | null>()
    .with('/_chat/bots/create', () => ({ kind: 'create' }))
    .with('/_chat/bots/$botId/$tab', () => match(botSection.safeParse(tab))
      .returnType<BotDialogView | null>()
      .with({ success: true }, ({ data }) => ({ kind: 'section', botId, section: data }))
      .otherwise(() => null))
    .with('/_chat/bots/$botId/delete', () => ({ kind: 'delete', botId }))
    .with('/_chat/bots/$botId/reset', () => ({ kind: 'reset', botId }))
    .with('/_chat/bots/$botId/routines/$routineId/edit', () => ({ kind: 'routine-edit', botId, routineId }))
    .with('/_chat/bots/$botId/routines/$routineId/delete', () => ({ kind: 'routine-delete', botId, routineId }))
    .with('/_chat/bots/$botId/todos/$todoId/delete', () => ({ kind: 'todo-delete', botId, todoId }))
    .with('/_chat/bots/$botId/mcp/$server/remove', () => ({ kind: 'mcp-remove', botId, server }))
    .otherwise(() => null);

  if (!view) {
    return null;
  }

  return <BotDialog view={view} onClose={close} />;
}
