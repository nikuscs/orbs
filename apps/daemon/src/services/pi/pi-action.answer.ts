import type { HarnessAnswerParams } from '#/types/harness.types';
import type { PiServiceDeps } from '#/types/pi.types';

export function piActionAnswer(deps: PiServiceDeps, params: HarnessAnswerParams): void {
  deps.turns.get(params.runId)?.approvals.get(params.approvalId)?.({ approved: params.approved, reason: params.reason });
}
