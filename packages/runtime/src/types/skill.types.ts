import { conversationContent } from '@repo/contracts/universal';
import { z } from 'zod';
import type { LoadSkillsResult, Skill } from '@earendil-works/pi-coding-agent';
import type * as UniversalTypes from '@repo/contracts/universal';

export const skillArgumentsSchema = z.record(z.string(), z.json()).parse(z.toJSONSchema(conversationContent));

export interface SkillLoaderServiceDeps {
  root: string;
  catalogs: Map<string, SkillCatalogCache>;
}

export interface SkillResolved extends Skill {
  argumentHint: string | null;
  isShared: boolean;
}

export interface SkillResolvedResult extends LoadSkillsResult {
  skills: SkillResolved[];
}

export interface SkillCatalogCache {
  key: string;
  expiresAt: number;
  result: SkillResolvedResult;
}

export interface SkillLoadParams {
  botId: string;
  directories: string[];
  isInherited: boolean;
  sharedSkills: string[] | null;
  disabledSkills: string[] | null;
}

export interface SkillLoadResult {
  prompt: string;
  skills: UniversalTypes.Skill[];
}

export interface SkillExpandParams extends SkillLoadParams {
  names: string[];
}

export interface SkillExpandResult {
  prompt: string;
}
