import type { HarnessServiceDeps } from '#/types/harness.types';

export function harnessActionConnect(deps: HarnessServiceDeps): void {
  deps.sockets.closeDaemons();
  deps.run.actions.disconnect();
}
