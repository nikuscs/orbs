import { log } from '@orbs/logger/daemon';
import type { RunServiceDeps } from '#/types/run.types';
import type { DaemonMemoryRequest } from '@orbs/server/daemon';

export async function runActionExtract(deps: RunServiceDeps, params: DaemonMemoryRequest): Promise<void> {
  const adapter = deps.harness.queries.get({ harnessId: 'pi' });

  try {
    const result = adapter && !await adapter.problem()
      ? await adapter.extract(params)
      : {
        type: 'memory.extracted' as const,
        requestId: params.requestId,
        roomId: params.roomId,
        generation: params.generation,
        result: null,
        error: 'unavailable' as const,
        usage: null,
      };

    deps.connection.actions.send(result);
  } catch (error) {
    log.error({
      tag: 'daemon',
      message: 'Memory extraction failed',
      error,
    });
    deps.connection.actions.send({
      type: 'memory.extracted',
      requestId: params.requestId,
      roomId: params.roomId,
      generation: params.generation,
      result: null,
      error: 'failed',
      usage: null,
    });
  }
}
