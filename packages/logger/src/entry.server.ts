import { createLogger } from 'evlog';
import { initWorkersLogger } from 'evlog/workers';
import { storage } from './context';
import { log } from './logger.log';
import type { LogPayload } from './logger.log';
import type { AuditableLogger, RequestLogger } from 'evlog';

const isDevelopment = import.meta.env.DEV;

initWorkersLogger({
  env: { service: 'orbs-web' },
  minLevel: isDevelopment ? 'debug' : 'warn',
});

export function initNativeLogger(): void {
  initWorkersLogger({
    env: { service: 'orbs-web' },
    minLevel: isDevelopment ? 'debug' : 'info',
  });
}

export { createLogger, log, storage };
export type { AuditableLogger, LogPayload, RequestLogger };
