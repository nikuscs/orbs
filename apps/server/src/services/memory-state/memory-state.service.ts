import { memoryStateActionMutate } from './memory-state-action.mutate';
import { memoryStateActionRecover } from './memory-state-action.recover';
import { memoryStateActionRefresh } from './memory-state-action.refresh';
import { memoryStateActionWipe } from './memory-state-action.wipe';
import { memoryStateQueryExport } from './memory-state-query.export';
import { memoryStateQueryList } from './memory-state-query.list';
import type * as MemoryStateTypes from '#/types/memory-state.types';
import type { MemoryWipeInput } from '#/types/memory.types';

export function makeMemoryStateService(deps: MemoryStateTypes.MemoryStateServiceDeps) {
  return {
    queries: {
      list: (params: MemoryStateTypes.MemoryStateQueryListParams) => memoryStateQueryList(deps, params),
      export: (params: MemoryStateTypes.MemoryStateQueryExportParams) => memoryStateQueryExport(deps, params),
    },
    actions: {
      wipe: (params: MemoryWipeInput) => memoryStateActionWipe(deps, params),
      recover: () => memoryStateActionRecover(deps),
      mutate: (params: MemoryStateTypes.MemoryStateActionMutateParams) => memoryStateActionMutate(deps, params),
      refresh: (params: MemoryStateTypes.MemoryStateActionRefreshParams) => memoryStateActionRefresh(deps, params),
    },
  };
}

export type MemoryStateService = ReturnType<typeof makeMemoryStateService>;
