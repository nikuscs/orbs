import { harnessQueryModels } from './harness-query.models';
import type { HarnessServiceDeps } from '#/types/harness.types';
import type { DaemonHarness } from '@orbs/server/daemon';

export async function harnessQueryCatalogue(deps: HarnessServiceDeps): Promise<DaemonHarness[]> {
  return Promise.all([...deps.adapters.entries()].map(async ([harnessId, adapter]) => ({
    harnessId,
    providers: await harnessQueryModels(deps, { harnessId }),
    problem: await adapter.problem(),
  })));
}
