import { getAgentDir, loadSkills, parseFrontmatter } from '@earendil-works/pi-coding-agent';
import { log } from '@repo/logger/server';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { match, P } from 'ts-pattern';
import type { SkillLoaderServiceDeps, SkillLoadParams, SkillResolvedResult } from '../../types/skill.types';

export function skillQueryResolve(deps: SkillLoaderServiceDeps, params: SkillLoadParams): SkillResolvedResult {
  const agentDir = getAgentDir();
  const key = JSON.stringify([agentDir, params.directories, params.isInherited]);
  const cacheId = `${params.botId}:${params.isInherited}`;
  const now = Date.now();

  const catalog = match(deps.catalogs.get(cacheId))
    .with({ key, expiresAt: P.number.gt(now) }, ({ result }) => result)
    .otherwise(() => {
      const result = skillResolveCatalog();
      deps.catalogs.set(cacheId, {
        key,
        expiresAt: now + 30_000,
        result,
      });

      return result;
    });

  return {
    ...catalog,
    skills: catalog.skills.filter((skill) => match(skill.isShared)
      .with(true, () => params.sharedSkills === null || params.sharedSkills.includes(skill.name))
      .with(false, () => !params.disabledSkills?.includes(skill.name))
      .exhaustive()),
  };

  function skillResolveCatalog(): SkillResolvedResult {
    const { root } = deps;
    const { botId, directories, isInherited } = params;
    const directory = join(root, 'agents', botId);
    const localPaths = [join(directory, '.pi/skills'), join(directory, '.agents/skills')];

    const sharedPaths = match(isInherited)
      .with(true, () => [...directories, ...[join(agentDir, 'skills')].filter(existsSync)])
      .with(false, () => [])
      .exhaustive();

    const result = loadSkills({
      cwd: root,
      agentDir,
      includeDefaults: false,
      skillPaths: [...localPaths.filter(existsSync), ...sharedPaths],
    });

    return {
      ...result,
      skills: result.skills.map((skill) => ({
        ...skill,
        argumentHint: skillArgumentHint(skill.filePath),
        isShared: !localPaths.some((path) => skill.filePath.startsWith(`${path}/`)),
      })),
    };
  }

  function skillArgumentHint(filePath: string): string | null {
    try {
      const { frontmatter } = parseFrontmatter(readFileSync(filePath, 'utf-8'));
      return match(frontmatter['argument-hint'])
        .with(P.string, (hint) => hint)
        .otherwise(() => null);
    } catch {
      log.warn({
        tag: 'skills',
        path: filePath,
        message: 'Cannot read skill argument hint.',
      });
      return null;
    }
  }
}
