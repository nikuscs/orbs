import { initLogger } from 'evlog';
import { log } from './logger.log';
import type { LogPayload } from './logger.log';

export function initDaemonLogger(nodeEnv: string): void {
  const isDevelopment = nodeEnv !== 'production';

  initLogger({
    env: { service: 'orbs-daemon' },
    pretty: isDevelopment,
    minLevel: isDevelopment ? 'debug' : 'warn',
  });
}

export { log };
export type { LogPayload };
