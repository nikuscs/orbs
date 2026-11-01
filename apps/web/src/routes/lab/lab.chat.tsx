import { m } from '@repo/i18n/client';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { LabChat } from '@/components/lab/lab-chat';
import { LayoutShellDashboard } from '@/components/layout/layout-shell-dashboard';
import { labMediaVideo } from '@/services/lab/lab-media.utils';
import { labChatQueryClient } from '@/services/lab/lab.client';
import { labChatFixture } from '@/services/lab/lab.utils';
import { layoutSidebarsOpen } from '@/services/layout/layout.client';
import { rpc } from '@/services/rpc/rpc.client';
import { seoHead } from '@/services/seo/seo.utils';

export const Route = createFileRoute('/lab/chat')({
  ssr: false,
  head: () => seoHead({ title: m.layout_lab_chat_meta_title() }),
  beforeLoad: ({ context }) => {
    if (!context.connection) {
      throw redirect({ to: '/connect' });
    }

    return { connection: context.connection };
  },
  loader: async ({ context }) => {
    const [sidebars] = await Promise.all([
      layoutSidebarsOpen(),
      context.queryClient.ensureQueryData(rpc.conversation.list.queryOptions()),
      context.queryClient.ensureQueryData(rpc.bots.list.queryOptions()),
    ]);

    const fixture = labChatFixture(Date.now(), await labMediaVideo());

    return {
      breadcrumb: m.layout_lab_chat_breadcrumb(),
      connection: context.connection,
      sidebars,
      fixture,
      queryClient: labChatQueryClient(fixture),
    };
  },
  component: LabChatRoute,
});

function LabChatRoute() {
  const { connection, sidebars, fixture, queryClient } = Route.useLoaderData();

  return (
    <LayoutShellDashboard connection={connection} sidebars={sidebars}>
      <LabChat fixture={fixture} queryClient={queryClient} />
    </LayoutShellDashboard>
  );
}
