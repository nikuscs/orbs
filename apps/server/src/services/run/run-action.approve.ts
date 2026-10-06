import { runActionArm } from './run-action.arm';
import { runApprovalAnswer } from './run.utils';
import type { RunActionApproveParams, RunServiceDeps } from '#/types/run.types';

export function runActionApprove(deps: RunServiceDeps, params: RunActionApproveParams): boolean {
  const approval = deps.database.all(deps.database.db
    .selectFrom('approval')
    .innerJoin('run', 'run.id', 'approval.runId')
    .select(['approval.id', 'approval.runId', 'approval.createdAt'])
    .where('approval.id', '=', params.approvalId)
    .where('approval.status', '=', 'pending')
    .where('approval.expiresAt', '>', Date.now())
    .where('run.status', '=', 'running')).at(0);

  if (!approval) {
    return false;
  }

  runApprovalAnswer(deps, approval, params.approved ? 'allowed' : 'denied', params.userName);
  runActionArm(deps);

  return true;
}
