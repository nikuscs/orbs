import { harnessActionDispose } from './harness-action.dispose';
import { harnessActionDrop } from './harness-action.drop';
import { harnessQueryCatalogue } from './harness-query.catalogue';
import { harnessQueryGet } from './harness-query.get';
import { harnessQueryModels } from './harness-query.models';
import type { HarnessDropParams, HarnessQueryGetParams, HarnessServiceDeps } from '#/types/harness.types';

export function makeHarnessService(deps: HarnessServiceDeps) {
  return {
    queries: {
      get: (params: HarnessQueryGetParams) => harnessQueryGet(deps, params),
      catalogue: () => harnessQueryCatalogue(deps),
      models: (params: HarnessQueryGetParams) => harnessQueryModels(deps, params),
    },
    actions: {
      dispose: () => harnessActionDispose(deps),
      drop: (params: HarnessDropParams) => harnessActionDrop(deps, params),
    },
  };
}

export type HarnessService = ReturnType<typeof makeHarnessService>;
