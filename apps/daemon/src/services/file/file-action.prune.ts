import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { skillResolveHome } from '#services/skill/skill.utils';
import { ROOM } from '@orbs/server/daemon';
import type { FileActionPruneParams } from '#/types/file.types';

export async function fileActionPrune(params: FileActionPruneParams): Promise<void> {
  const root = skillResolveHome(ROOM.filesRoot);
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const alive = new Set(params.roomIds);

  await Promise.all(entries
    .filter((entry) => entry.isDirectory() && !alive.has(entry.name))
    .map((entry) => rm(join(root, entry.name), { recursive: true, force: true })));
}
