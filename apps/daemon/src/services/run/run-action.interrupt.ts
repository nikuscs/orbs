import type { RunServiceDeps } from '#/types/run.types';
import type { DaemonInterruptMessage } from '@orbs/server/daemon';

export async function runActionInterrupt(deps: RunServiceDeps, params: DaemonInterruptMessage): Promise<void> {
  const turn = deps.turns.get(params.runId);

  turn?.controller.abort();

  if (turn && !turn.downloading) {
    await turn.adapter?.interrupt({ runId: params.runId });
  }
}
