import type { HarnessActionModelsListedParams, HarnessServiceDeps } from '#/types/harness.types';

export function harnessActionModelsListed(deps: HarnessServiceDeps, params: HarnessActionModelsListedParams): void {
  deps.modelRequests.get(params.requestId)?.(params.providers);
  deps.modelRequests.delete(params.requestId);
}
