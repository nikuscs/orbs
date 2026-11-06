import { skillActionConfigure } from './skill-action.configure';
import { skillQueryDiscover } from './skill-query.discover';
import { skillQueryExpand } from './skill-query.expand';
import { skillQueryLoad } from './skill-query.load';
import { skillQueryLocal } from './skill-query.local';
import { skillQuerySettings } from './skill-query.settings';
import { skillQueryShared } from './skill-query.shared';
import type * as SkillTypes from '../../types/skill.types';
import type { SkillConfigureInput } from '@repo/contracts/universal';

export function makeSkillService(deps: SkillTypes.SkillServiceDeps) {
  return {
    actions: {
      configure: (params: SkillConfigureInput) => skillActionConfigure(deps, params),
    },
    queries: {
      settings: () => skillQuerySettings(deps),
      load: (params: SkillTypes.SkillLoadParams) => skillQueryLoad(deps, params),
      expand: (params: SkillTypes.SkillExpandParams) => skillQueryExpand(deps, params),
      discover: (params: SkillTypes.SkillBotParams) => skillQueryDiscover(deps, params),
      shared: (params: SkillTypes.SkillBotParams) => skillQueryShared(deps, params),
      local: (params: SkillTypes.SkillBotParams) => skillQueryLocal(deps, params),
    },
  };
}

export type SkillService = ReturnType<typeof makeSkillService>;
