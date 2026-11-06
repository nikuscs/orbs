import { skillQueryLoad } from './skill-query.load';
import { skillQuerySettings } from './skill-query.settings';
import type { SkillBotParams, SkillServiceDeps } from '../../types/skill.types';

export async function skillQueryLocal(deps: SkillServiceDeps, { bot }: SkillBotParams) {
  const settings = await skillQuerySettings(deps);

  const { skills } = skillQueryLoad(deps, {
    bot: { ...bot, inherit: [], disabledSkills: null },
    settings,
  });

  return skills;
}
