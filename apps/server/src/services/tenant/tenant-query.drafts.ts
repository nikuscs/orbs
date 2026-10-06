import type { TenantQueryDraftsParams, TenantRunDraft, TenantServiceDeps } from '#/types/tenant.types';

export async function tenantQueryDrafts(deps: TenantServiceDeps, params: TenantQueryDraftsParams): Promise<TenantRunDraft[]> {
  const drafts = await deps.namespace.getByName(params.organizationId).runDrafts({ roomId: params.roomId });

  return drafts.map((draft) => ({
    runId: draft.runId,
    chunks: draft.chunks.map((chunk) => ({ id: chunk.id, chunk: JSON.parse(chunk.body) })),
  }));
}
