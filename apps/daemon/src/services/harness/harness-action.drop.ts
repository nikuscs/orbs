import type { HarnessDropParams, HarnessServiceDeps } from '#/types/harness.types';

export async function harnessActionDrop(deps: HarnessServiceDeps, params: HarnessDropParams): Promise<void> {
  await Promise.all([...deps.adapters.values()].map((adapter) => adapter.drop(params)));
}
