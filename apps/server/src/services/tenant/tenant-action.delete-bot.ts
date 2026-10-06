import type { TenantActionDeleteBotParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionDeleteBot(deps: TenantServiceDeps, params: TenantActionDeleteBotParams): Promise<void> {
  await deps.namespace.getByName(params.organizationId).botDelete({ botId: params.botId });
}
