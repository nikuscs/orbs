import { tenantSocketTag } from './tenant.utils';
import type { TenantActionDisconnectParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionDisconnect(deps: TenantServiceDeps, params: TenantActionDisconnectParams): Promise<void> {
  await deps.namespace.getByName(params.organizationId).socketsClose({ tag: tenantSocketTag(params.owner) });
}
