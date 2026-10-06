import { rm } from 'node:fs/promises';
import { basename, dirname, extname } from 'node:path';
import { PI } from './pi.constants';
import { piStop } from './pi.utils';
import type { HarnessDropParams } from '#/types/harness.types';
import type { PiServiceDeps } from '#/types/pi.types';

export async function piActionDrop(deps: PiServiceDeps, params: HarnessDropParams): Promise<void> {
  const piSessionFiles = params.sessionFiles.filter((file) => extname(file) === '.jsonl' && basename(dirname(file)) === PI.sessionsDir);

  for (const [key, warm] of deps.sessions) {
    if (warm.sessionFile && piSessionFiles.includes(warm.sessionFile)) {
      clearTimeout(warm.idle);
      piStop(warm.piProcess);
      deps.sessions.delete(key);
    }
  }

  await Promise.all(piSessionFiles.map((file) => rm(file, { force: true })));
}
