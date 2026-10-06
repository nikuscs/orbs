import { harnessQueryList } from './harness-query.list';
import { HARNESS } from './harness.constants';
import type { DaemonHarness, DaemonProvider } from '#/types/daemon.types';
import type { HarnessActionListModelsParams, HarnessServiceDeps } from '#/types/harness.types';

export function harnessActionListModels(deps: HarnessServiceDeps, params: HarnessActionListModelsParams): Promise<DaemonProvider[] | null> {
  function harnessSaveProviders(serviceDeps: HarnessServiceDeps, harnessId: string, providers: DaemonProvider[]): void {
    const saved = harnessQueryList(serviceDeps).find((harness) => harness.harnessId === harnessId);
    const harness: DaemonHarness = { harnessId, providers, problem: saved?.problem ?? null };

    serviceDeps.database.run(serviceDeps.database.db
      .updateTable('harness')
      .set({ catalogue: JSON.stringify(harness), updatedAt: new Date().toISOString() })
      .where('id', '=', harnessId));
  }

  const daemon = deps.sockets.daemon();

  if (!daemon) {
    return Promise.resolve(null);
  }

  const requestId = crypto.randomUUID();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      deps.modelRequests.delete(requestId);
      resolve(null);
    }, HARNESS.modelsTimeoutMs);

    deps.modelRequests.set(requestId, (providers) => {
      clearTimeout(timer);
      harnessSaveProviders(deps, params.harnessId, providers);
      resolve(providers);
    });
    daemon.send({
      type: 'models.list',
      requestId,
      harnessId: params.harnessId,
    });
  });
}
