import { Errors } from '@orbs/errors/universal';
import type { TenantActionApproveParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionApprove(deps: TenantServiceDeps, params: TenantActionApproveParams): Promise<void> {
  const answered = await deps.namespace.getByName(params.organizationId).runApprove({
    approvalId: params.approvalId,
    approved: params.approved,
    userName: params.userName,
  });

  if (!answered) {
    throw new Errors.NOT_FOUND({ resource: 'approval', resourceId: params.approvalId });
  }
}
