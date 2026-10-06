import { homedir } from 'node:os';
import { join } from 'node:path';
import { skillFile } from '#/types/skill.types';
import type { SkillFile } from '#/types/skill.types';

export function skillResolveHome(dir: string): string {
  return dir.startsWith('~/') ? join(homedir(), dir.slice(2)) : dir;
}

export function skillFrontmatter(text: string): SkillFile | null {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1];

  if (block === undefined) {
    return null;
  }

  try {
    const parsed = skillFile.safeParse(Bun.YAML.parse(block));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
