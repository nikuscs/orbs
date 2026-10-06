import { rmSync } from 'node:fs';
import { piStop } from './pi.utils';
import type { PiServiceDeps } from '#/types/pi.types';

export function piActionDispose(deps: PiServiceDeps): void {
  for (const warm of deps.sessions.values()) {
    clearTimeout(warm.idle);
    piStop(warm.piProcess);
  }

  deps.sessions.clear();
  rmSync(deps.tempFiles.dir, { recursive: true, force: true });
  deps.tempFiles.bridgeWritten = null;
}
