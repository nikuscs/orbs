import { Errors } from '@orbs/errors/universal';
import type { TenantActionRetryParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionRetry(deps: TenantServiceDeps, params: TenantActionRetryParams): Promise<void> {
  const retried = await deps.namespace.getByName(params.organizationId).runRetry({ roomId: params.roomId, runId: params.runId });

  if (!retried) {
    throw new Errors.NOT_FOUND({ resource: 'run', resourceId: params.runId });
  }
}
