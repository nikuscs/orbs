import type { DaemonProvider } from '#/types/daemon.types';
import type { TenantQueryModelsParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantQueryModels(deps: TenantServiceDeps, params: TenantQueryModelsParams): Promise<DaemonProvider[]> {
  const tenant = deps.namespace.getByName(params.organizationId);
  const live = await tenant.daemonModels({ harnessId: params.harnessId });

  if (live) {
    return live;
  }

  const saved = await tenant.daemonHarnesses();

  return saved.find((harness) => harness.harnessId === params.harnessId)?.providers ?? [];
}
