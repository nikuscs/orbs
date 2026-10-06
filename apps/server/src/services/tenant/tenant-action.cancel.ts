import { Errors } from '@orbs/errors/universal';
import type { TenantActionCancelParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionCancel(deps: TenantServiceDeps, params: TenantActionCancelParams): Promise<void> {
  const cancelled = await deps.namespace.getByName(params.organizationId).runCancel({ roomId: params.roomId, runId: params.runId });

  if (!cancelled) {
    throw new Errors.NOT_FOUND({ resource: 'run', resourceId: params.runId });
  }
}
