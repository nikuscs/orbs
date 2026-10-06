import { piRequest } from './pi.utils';
import type { HarnessSteerParams } from '#/types/harness.types';
import type { PiServiceDeps } from '#/types/pi.types';

export async function piActionSteer(deps: PiServiceDeps, params: HarnessSteerParams): Promise<void> {
  const turn = deps.turns.get(params.runId);

  if (!turn || turn.cancelled) {
    return;
  }

  if (!turn.piProcess) {
    turn.pending.push(params.text);
    turn.steeredMessageIds.push(params.messageId);

    return;
  }

  turn.steers.push({ messageId: params.messageId, text: params.text });
  await piRequest(turn.piProcess, { type: 'steer', message: params.text });
}
