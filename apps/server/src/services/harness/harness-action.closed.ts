import type { HarnessActionClosedParams, HarnessServiceDeps } from '#/types/harness.types';

export function harnessActionClosed(deps: HarnessServiceDeps, params: HarnessActionClosedParams): void {
  if (!params.othersOpen) {
    deps.run.actions.disconnect();
  }
}
