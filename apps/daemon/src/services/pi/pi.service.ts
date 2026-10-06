import { piActionAnswer } from './pi-action.answer';
import { piActionDispose } from './pi-action.dispose';
import { piActionDrop } from './pi-action.drop';
import { piActionExtract } from './pi-action.extract';
import { piActionInterrupt } from './pi-action.interrupt';
import { piActionJudge } from './pi-action.judge';
import { piActionStartTurn } from './pi-action.start-turn';
import { piActionSteer } from './pi-action.steer';
import { piQueryCatalogue } from './pi-query.catalogue';
import { piQueryProblem } from './pi-query.problem';
import type * as HarnessTypes from '#/types/harness.types';
import type { PiServiceDeps } from '#/types/pi.types';
import type { DaemonMemoryRequest } from '@orbs/server/daemon';

export function makePiService(deps: PiServiceDeps) {
  return {
    actions: {
      extract: (params: DaemonMemoryRequest) => piActionExtract(deps, params),
      startTurn: (params: HarnessTypes.HarnessTurnParams) => piActionStartTurn(deps, params),
      judge: (params: HarnessTypes.HarnessJudgeParams) => piActionJudge(deps, params),
      interrupt: (params: HarnessTypes.HarnessInterruptParams) => piActionInterrupt(deps, params),
      steer: (params: HarnessTypes.HarnessSteerParams) => piActionSteer(deps, params),
      answer: (params: HarnessTypes.HarnessAnswerParams) => piActionAnswer(deps, params),
      drop: (params: HarnessTypes.HarnessDropParams) => piActionDrop(deps, params),
      dispose: () => piActionDispose(deps),
      catalogue: () => piQueryCatalogue(deps),
      problem: () => piQueryProblem(deps),
    },
  };
}

export type PiService = ReturnType<typeof makePiService>;
