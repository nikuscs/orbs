import { skillQueryList } from './skill-query.list';
import type { SkillQueryListParams, SkillServiceDeps } from '#/types/skill.types';

export function makeSkillService(deps: SkillServiceDeps) {
  return {
    queries: {
      list: (params: SkillQueryListParams) => skillQueryList(deps, params),
    },
  };
}

export type SkillService = ReturnType<typeof makeSkillService>;
