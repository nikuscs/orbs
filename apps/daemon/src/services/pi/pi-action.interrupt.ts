import { piRequest } from './pi.utils';
import type { HarnessInterruptParams } from '#/types/harness.types';
import type { PiServiceDeps } from '#/types/pi.types';

export async function piActionInterrupt(deps: PiServiceDeps, params: HarnessInterruptParams): Promise<void> {
  const turn = deps.turns.get(params.runId);

  if (!turn) {
    return;
  }

  turn.cancelled = true;

  for (const resolve of turn.approvals.values()) {
    resolve({ approved: false, reason: '' });
  }

  if (!turn.piProcess) {
    return;
  }

  const queueCleared = piRequest(turn.piProcess, { type: 'clear_queue' });
  const aborted = piRequest(turn.piProcess, { type: 'abort' });
  await Promise.allSettled([queueCleared, aborted]);
}
