import type { RunServiceDeps } from '#/types/run.types';
import type { DaemonApprovalAnswerMessage } from '@orbs/server/daemon';

export function runActionAnswer(deps: RunServiceDeps, params: DaemonApprovalAnswerMessage): void {
  deps.turns.get(params.runId)?.adapter?.answer({
    runId: params.runId,
    approvalId: params.approvalId,
    approved: params.approved,
    reason: params.reason,
  });
}
