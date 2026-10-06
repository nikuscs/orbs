import { match } from 'ts-pattern';
import { daemonClientMessage, daemonHandshake } from '#/types/daemon.types';
import { TENANT } from './tenant.constants';
import type { TenantCallsDaemonMessageParams, TenantCallsServiceDeps } from '#/types/tenant-calls.types';

export async function tenantActionDaemonMessage(deps: TenantCallsServiceDeps, params: TenantCallsDaemonMessageParams): Promise<void> {
  const { socket } = params;
  const data = JSON.parse(params.data);
  const handshake = daemonHandshake.safeParse(data);

  if (handshake.success && handshake.data.protocol !== TENANT.daemonProtocol) {
    deps.harness.actions.refuse(handshake.data);
    socket.close(TENANT.daemonProtocolCloseCode, String(TENANT.daemonProtocol));

    return;
  }

  const message = daemonClientMessage.safeParse(data);

  if (!message.success) {
    return;
  }

  await match(message.data)
    .with({ type: 'memory.extracted' }, async (result) => {
      const received = await deps.exclusive(async () => {
        if (!socket.current()) {
          return false;
        }

        await deps.memoryCapture.actions.receive(result);

        return true;
      });

      if (received) {
        deps.run.actions.arm();
      }
    })
    .with({ type: 'mcp-internal.call' }, async (request) => {
      const result = await deps.exclusive(() => deps.mcpInternal.actions.call(request));

      socket.send({
        type: 'mcp-internal.result',
        requestId: request.requestId,
        ...result,
      });
    })
    .with({ type: 'daemon.ready' }, (ready) => {
      socket.attach({ harnessIds: ready.harnesses.map((harness) => harness.harnessId), maxTurns: ready.maxTurns });
      deps.harness.actions.ready(ready);
    })
    .with({ type: 'run.accepted' }, (accepted) => deps.run.actions.accept(accepted))
    .with({ type: 'run.chunk' }, (chunk) => deps.run.actions.chunk(chunk))
    .with({ type: 'run.approval' }, (approval) => deps.run.actions.approval(approval))
    .with({ type: 'run.end' }, (end) => deps.run.actions.end(end))
    .with({ type: 'skills.listed' }, (listed) => deps.harness.actions.skillsListed(listed))
    .with({ type: 'models.listed' }, (listed) => deps.harness.actions.modelsListed(listed))
    .with({ type: 'judge.decided' }, (decided) => deps.route.actions.judged(decided))
    .exhaustive();
}
