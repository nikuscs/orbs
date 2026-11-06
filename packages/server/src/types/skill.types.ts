import type { SettingsService } from '../services/settings/settings.service';
import type { Bot, SkillSettings } from '@repo/contracts/universal';
import type { SkillLoaderService } from '@repo/runtime/server';

export interface SkillServiceDeps {
  settings: SettingsService;
  loader: SkillLoaderService;
}

export interface SkillBotParams {
  bot: Pick<Bot, 'id' | 'inherit' | 'sharedSkills' | 'disabledSkills'>;
}

export interface SkillLoadParams extends SkillBotParams {
  settings: SkillSettings;
}

export interface SkillExpandParams extends SkillBotParams {
  names: string[];
}
