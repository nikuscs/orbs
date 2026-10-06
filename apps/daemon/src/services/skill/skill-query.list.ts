import { join } from 'node:path';
import { SKILL } from './skill.constants';
import { skillFrontmatter, skillResolveHome } from './skill.utils';
import type { SkillQueryListParams, SkillServiceDeps } from '#/types/skill.types';
import type { DaemonSkill } from '@orbs/server/daemon';

export async function skillQueryList(deps: SkillServiceDeps, params: SkillQueryListParams): Promise<DaemonSkill[]> {
  async function skillScan(dir: string, source: DaemonSkill['source']): Promise<DaemonSkill[]> {
    const files = await Array.fromAsync(new Bun.Glob(`*/${SKILL.file}`).scan({ cwd: dir, onlyFiles: true })).catch(() => []);
    const skills = await Promise.all(files.sort((a, b) => a.localeCompare(b)).map(async (file) => skillFrontmatter(await Bun.file(join(dir, file)).text())));

    return skills.flatMap((skill) => (skill ? { ...skill, source } : []));
  }

  const own = { home: params.homeDir, source: 'bot' } as const;
  const homes = params.inherit.includes('skills') ? [own, { home: deps.sharedHome, source: 'shared' } as const] : [own];
  const found = await Promise.all(homes.map(({ home, source }) => skillScan(join(skillResolveHome(home), SKILL.dir), source)));
  const names = new Set<string>();

  return found.flat().filter((skill) => !names.has(skill.name) && Boolean(names.add(skill.name)));
}
