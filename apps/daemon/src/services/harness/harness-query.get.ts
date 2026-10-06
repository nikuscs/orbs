import type { HarnessAdapter, HarnessQueryGetParams, HarnessServiceDeps } from '#/types/harness.types';

export function harnessQueryGet(deps: HarnessServiceDeps, params: HarnessQueryGetParams): HarnessAdapter | null {
  return deps.adapters.get(params.harnessId) ?? null;
}
