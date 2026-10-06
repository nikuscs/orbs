import { harnessActionClosed } from './harness-action.closed';
import { harnessActionConnect } from './harness-action.connect';
import { harnessActionListModels } from './harness-action.list-models';
import { harnessActionListSkills } from './harness-action.list-skills';
import { harnessActionModelsListed } from './harness-action.models-listed';
import { harnessActionReady } from './harness-action.ready';
import { harnessActionRefuse } from './harness-action.refuse';
import { harnessActionSave } from './harness-action.save';
import { harnessActionSkillsListed } from './harness-action.skills-listed';
import { harnessQueryList } from './harness-query.list';
import type * as HarnessTypes from '#/types/harness.types';

export function makeHarnessService(deps: HarnessTypes.HarnessServiceDeps) {
  return {
    queries: {
      list: () => harnessQueryList(deps),
    },
    actions: {
      save: (params: HarnessTypes.HarnessActionSaveParams) => harnessActionSave(deps, params),
      listSkills: (params: HarnessTypes.HarnessActionListSkillsParams) => harnessActionListSkills(deps, params),
      skillsListed: (params: HarnessTypes.HarnessActionSkillsListedParams) => harnessActionSkillsListed(deps, params),
      listModels: (params: HarnessTypes.HarnessActionListModelsParams) => harnessActionListModels(deps, params),
      modelsListed: (params: HarnessTypes.HarnessActionModelsListedParams) => harnessActionModelsListed(deps, params),
      connect: () => harnessActionConnect(deps),
      ready: (params: HarnessTypes.HarnessActionReadyParams) => harnessActionReady(deps, params),
      refuse: (params: HarnessTypes.HarnessActionRefuseParams) => harnessActionRefuse(deps, params),
      closed: (params: HarnessTypes.HarnessActionClosedParams) => harnessActionClosed(deps, params),
      revoked: deps.run.actions.disconnect,
    },
  };
}

export type HarnessService = ReturnType<typeof makeHarnessService>;
