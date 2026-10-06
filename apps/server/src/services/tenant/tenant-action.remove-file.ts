import { Errors } from '@orbs/errors/universal';
import type { TenantActionRemoveFileParams, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantActionRemoveFile(deps: TenantServiceDeps, params: TenantActionRemoveFileParams): Promise<void> {
  const result = await deps.namespace.getByName(params.organizationId).roomRemoveFile({ roomId: params.roomId, fileId: params.fileId });

  if (result === 'sent') {
    throw new Errors.FORBIDDEN();
  }

  if (!result) {
    throw new Errors.NOT_FOUND({ resource: 'file' });
  }
}
