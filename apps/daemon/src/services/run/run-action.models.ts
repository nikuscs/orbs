import type { RunServiceDeps } from '#/types/run.types';
import type { DaemonModelsListMessage } from '@orbs/server/daemon';

export async function runActionModels(deps: RunServiceDeps, params: DaemonModelsListMessage): Promise<void> {
  const providers = await deps.harness.queries.models({ harnessId: params.harnessId });

  deps.connection.actions.send({
    type: 'models.listed',
    requestId: params.requestId,
    providers,
  });
}
