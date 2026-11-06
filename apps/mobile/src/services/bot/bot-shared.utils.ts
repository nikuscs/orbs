import { m } from '@repo/i18n/client';
import type { BotSharedSelectedParams, BotSharedSkillsSummaryParams } from '@/types/bot-shared.types';

export function botSharedSelected({ resource, names, inherit, shared }: BotSharedSelectedParams): Set<string> {
  if (!inherit.includes(resource)) {
    return new Set();
  }

  return new Set(shared?.length ? names.filter((name) => shared.includes(name)) : names);
}

export function botSharedSkillsSummary({ sharedSelected, sharedTotal, localNames, disabled }: BotSharedSkillsSummaryParams): string {
  const localSelected = localNames.filter((name) => !disabled?.includes(name)).length;

  return [
    sharedTotal > 0 ? m.bots_skills_summary_shared({ selected: String(sharedSelected), total: String(sharedTotal) }) : null,
    localNames.length > 0 ? m.bots_skills_summary_local({ selected: String(localSelected), total: String(localNames.length) }) : null,
  ].filter(Boolean).join(' · ');
}
