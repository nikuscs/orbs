import type { BotForm } from '@repo/contracts/universal';

export type BotSharedResource = 'skills' | 'mcp';

export type BotSharedField = 'sharedSkills' | 'sharedMcp';

export type BotSharedForm = Pick<BotForm, 'inherit' | 'sharedSkills' | 'sharedMcp' | 'disabledSkills'>;

export interface BotSharedItem {
  name: string;
  detail: string;
  keywords: string;
}

export interface BotSharedMessages {
  search: string;
  noMatch: string;
  loadFailed: string;
  note: string;
  empty?: string;
}

export interface BotSharedList {
  field: BotSharedField;
  items: BotSharedItem[] | undefined;
  isError: boolean;
  messages: BotSharedMessages;
}

export interface BotSharedSelectedParams {
  resource: BotSharedResource;
  names: string[];
  inherit: BotForm['inherit'];
  shared: BotForm['sharedSkills'];
}

export interface BotSharedSkillsSummaryParams {
  sharedSelected: number;
  sharedTotal: number;
  localNames: string[];
  disabled: BotForm['disabledSkills'];
}
