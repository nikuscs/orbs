import { log } from '@orbs/logger/daemon';
import type { HarnessAdapter, HarnessJudgeParams, HarnessJudgeResult } from '#/types/harness.types';
import type { RunServiceDeps } from '#/types/run.types';
import type { DaemonJudgeMessage } from '@orbs/server/daemon';

export async function runActionJudge(deps: RunServiceDeps, params: DaemonJudgeMessage): Promise<void> {
  async function runJudge(adapter: HarnessAdapter | null, input: HarnessJudgeParams): Promise<HarnessJudgeResult> {
    const unanswered: HarnessJudgeResult = { handles: null, resume: input.resume, usage: null };

    if (!adapter || await adapter.problem()) {
      return unanswered;
    }

    try {
      return await adapter.judge(input);
    } catch (error) {
      log.error({
        tag: 'daemon',
        message: 'judge turn failed',
        roomId: input.roomId,
        error,
      });

      return unanswered;
    }
  }

  const adapter = deps.harness.queries.get({ harnessId: params.harnessId });
  const result = await runJudge(adapter, params);

  deps.connection.actions.send({
    type: 'judge.decided',
    requestId: params.requestId,
    ...result,
  });
}
