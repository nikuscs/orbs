import { runActionArm } from './run-action.arm';
import { runQueryGet } from './run-query.get';
import { RUN } from './run.constants';
import { runApprovalAnswer, runChunkSave } from './run.utils';
import type { RunActionApprovalParams, RunServiceDeps } from '#/types/run.types';

export async function runActionApproval(deps: RunServiceDeps, params: RunActionApprovalParams): Promise<void> {
  const run = runQueryGet(deps, params);

  if (run?.status !== 'running') {
    return;
  }

  const now = Date.now();
  const createdAt = new Date(now).toISOString();
  const input = JSON.stringify(params.input ?? null);
  const approval = { id: params.approvalId, runId: run.id, createdAt };

  deps.database.run(deps.database.db.insertInto('approval').values({
    ...approval,
    toolCallId: params.toolCallId,
    toolName: params.toolName,
    input,
    status: 'pending',
    answeredBy: null,
    expiresAt: now + RUN.approvalTimeoutMs,
    updatedAt: createdAt,
  }));

  runActionArm(deps);

  const allowed = run.permission === 'auto' && await deps.route.queries.approval({
    roomId: run.roomId,
    botName: run.botName,
    instructions: run.instructions,
    toolName: params.toolName,
    input,
  });

  const stillRunning = runQueryGet(deps, params)?.status === 'running';

  if (!stillRunning) {
    return;
  }

  if (allowed) {
    runApprovalAnswer(deps, approval, 'allowed', null);
    runActionArm(deps);

    return;
  }

  runChunkSave(deps, run, {
    type: 'tool-approval-request',
    approvalId: params.approvalId,
    toolCallId: params.toolCallId,
  });
}
