import { log } from '@orbs/logger/daemon';
import { match } from 'ts-pattern';
import { runActionAnswer } from './run-action.answer';
import { runActionExtract } from './run-action.extract';
import { runActionInterrupt } from './run-action.interrupt';
import { runActionJudge } from './run-action.judge';
import { runActionModels } from './run-action.models';
import { runActionSkills } from './run-action.skills';
import { runActionStart } from './run-action.start';
import { runActionSteer } from './run-action.steer';
import type { RunServiceDeps } from '#/types/run.types';
import type { DaemonServerMessage } from '@orbs/server/daemon';

export async function runActionReceive(deps: RunServiceDeps, params: DaemonServerMessage): Promise<void> {
  try {
    await match(params)
      .with({ type: 'memory.extract' }, (request) => runActionExtract(deps, request))
      .with({ type: 'mcp-internal.result' }, (result) => deps.mcpInternal.actions.answer(result))
      .with({ type: 'run.start' }, (start) => runActionStart(deps, start))
      .with({ type: 'run.interrupt' }, (interrupt) => runActionInterrupt(deps, interrupt))
      .with({ type: 'run.steer' }, (steer) => runActionSteer(deps, steer))
      .with({ type: 'run.approval.answer' }, (answer) => runActionAnswer(deps, answer))
      .with({ type: 'skills.list' }, (list) => runActionSkills(deps, list))
      .with({ type: 'models.list' }, (list) => runActionModels(deps, list))
      .with({ type: 'judge.decide' }, (decide) => runActionJudge(deps, decide))
      .with({ type: 'room.deleted' }, async (deleted) => {
        await Promise.all([...deps.turns].filter(([, turn]) => turn.roomId === deleted.roomId).map(([runId, turn]) => {
          turn.deleted = true;

          return runActionInterrupt(deps, { type: 'run.interrupt', runId });
        }));

        await Promise.all([
          deps.harness.actions.drop({ sessionFiles: deleted.sessionFiles }),
          deps.file.actions.removeRoom({ roomId: deleted.roomId }),
        ]);
      })
      .with({ type: 'rooms.alive' }, (alive) => deps.file.actions.prune({ roomIds: alive.roomIds }))
      .exhaustive();
  } catch (error) {
    log.error({
      tag: 'daemon',
      message: 'daemon message failed',
      type: params.type,
      error,
    });
  }
}
