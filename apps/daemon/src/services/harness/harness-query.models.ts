import { log } from '@orbs/logger/daemon';
import type { HarnessQueryGetParams, HarnessServiceDeps } from '#/types/harness.types';
import type { DaemonProvider } from '@orbs/server/daemon';

export async function harnessQueryModels(deps: HarnessServiceDeps, params: HarnessQueryGetParams): Promise<DaemonProvider[]> {
  const adapter = deps.adapters.get(params.harnessId);

  if (!adapter || await adapter.problem()) {
    return [];
  }

  try {
    return await adapter.catalogue();
  } catch (error) {
    log.warn({
      tag: 'daemon',
      message: 'harness catalogue failed',
      harnessId: params.harnessId,
      error,
    });

    return [];
  }
}
