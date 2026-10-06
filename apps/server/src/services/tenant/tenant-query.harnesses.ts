import type { DaemonHarness } from '#/types/daemon.types';
import type { TenantQueryHarnessesParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantQueryHarnesses(deps: TenantServiceDeps, params: TenantQueryHarnessesParams): Promise<DaemonHarness[]> {
  return deps.namespace.getByName(params.organizationId).daemonHarnesses();
}
