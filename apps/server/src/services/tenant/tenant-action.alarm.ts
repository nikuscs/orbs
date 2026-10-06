import { log } from '@orbs/logger/server';
import type { DaemonMemoryRequest } from '#/types/daemon.types';
import type { TenantCallsServiceDeps } from '#/types/tenant-calls.types';

export async function tenantActionAlarm(deps: TenantCallsServiceDeps): Promise<void> {
  async function tenantMemoryJudge(request: DaemonMemoryRequest): Promise<void> {
    try {
      const useful = await deps.route.queries.memory({ prompt: request.prompt });
      await deps.exclusive(async () => deps.memoryCapture.actions.dispatch({ request, useful }));
    } catch (error) {
      log.warn({
        tag: 'memory',
        message: 'Memory classification will retry after its lease expires',
        error,
      });
    } finally {
      deps.run.actions.arm();
    }
  }

  const delivered = deps.room.actions.deliverReactions();

  await deps.run.actions.expire();
  await delivered;
  try {
    await deps.exclusive(() => deps.memoryState.actions.recover());
    const request = await deps.exclusive(() => deps.memoryCapture.actions.tick());

    if (request) {
      deps.waitUntil(tenantMemoryJudge(request));
    }
  } finally {
    deps.run.actions.dispatch();
    deps.run.actions.arm();
  }
}
