import type { RunServiceDeps } from '#/types/run.types';
import type { DaemonSteerMessage } from '@orbs/server/daemon';

export async function runActionSteer(deps: RunServiceDeps, params: DaemonSteerMessage): Promise<void> {
  await deps.turns.get(params.runId)?.adapter?.steer({
    runId: params.runId,
    messageId: params.messageId,
    text: params.text,
  });
}
