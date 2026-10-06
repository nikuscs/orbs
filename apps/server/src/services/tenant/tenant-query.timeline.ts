import { Errors } from '@orbs/errors/universal';
import { tenantMessages } from './tenant.utils';
import type { TenantQueryTimelineParams, TenantServiceDeps, TenantTimeline } from '#/types/tenant.types';

export async function tenantQueryTimeline(deps: TenantServiceDeps, params: TenantQueryTimelineParams): Promise<TenantTimeline> {
  const timeline = await deps.namespace.getByName(params.organizationId).roomTimeline({ roomId: params.roomId });

  if (!timeline) {
    throw new Errors.NOT_FOUND();
  }

  return { room: timeline.room, messages: await tenantMessages(timeline.messages), runs: timeline.runs };
}
