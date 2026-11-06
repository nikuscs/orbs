import type { SkillLoadParams, SkillServiceDeps } from '../../types/skill.types';

export function skillQueryLoad(deps: SkillServiceDeps, { bot, settings }: SkillLoadParams) {
  return deps.loader.queries.load({
    botId: bot.id,
    directories: settings.directories,
    isInherited: bot.inherit.includes('skills'),
    sharedSkills: bot.sharedSkills,
    disabledSkills: bot.disabledSkills,
  });
}
