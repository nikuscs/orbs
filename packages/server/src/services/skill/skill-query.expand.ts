import { skillQuerySettings } from './skill-query.settings';
import type { SkillExpandParams, SkillServiceDeps } from '../../types/skill.types';

export async function skillQueryExpand(deps: SkillServiceDeps, { bot, names }: SkillExpandParams) {
  const settings = await skillQuerySettings(deps);
  return deps.loader.queries.expand({
    botId: bot.id,
    directories: settings.directories,
    isInherited: bot.inherit.includes('skills'),
    sharedSkills: bot.sharedSkills,
    disabledSkills: bot.disabledSkills,
    names,
  });
}
