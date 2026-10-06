import type { HarnessActionSkillsListedParams, HarnessServiceDeps } from '#/types/harness.types';

export function harnessActionSkillsListed(deps: HarnessServiceDeps, params: HarnessActionSkillsListedParams): void {
  deps.skillRequests.get(params.requestId)?.(params.skills);
  deps.skillRequests.delete(params.requestId);
}
