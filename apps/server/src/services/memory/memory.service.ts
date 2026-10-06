import { memoryActionForget } from './memory-action.forget';
import { memoryActionRemoveRoom } from './memory-action.remove-room';
import { memoryActionSave } from './memory-action.save';
import { memoryActionShare } from './memory-action.share';
import { memoryActionUpdate } from './memory-action.update';
import { memoryActionWipe } from './memory-action.wipe';
import { memoryQueryCandidates } from './memory-query.candidates';
import { memoryQueryExport } from './memory-query.export';
import { memoryQueryGet } from './memory-query.get';
import { memoryQueryList } from './memory-query.list';
import { memoryQuerySnapshot } from './memory-query.snapshot';
import { memoryQuerySuppressed } from './memory-query.suppressed';
import { memoryQueryWipe } from './memory-query.wipe';
import type * as MemoryTypes from '#/types/memory.types';
import type { TenantActionDeleteRoomParams } from '#/types/tenant.types';

export function makeMemoryService(deps: MemoryTypes.MemoryServiceDeps) {
  return {
    queries: {
      wipe: (params: MemoryTypes.MemoryActionWipeParams) => memoryQueryWipe(deps, params),
      candidates: (params: MemoryTypes.MemoryQueryCandidatesParams) => memoryQueryCandidates(deps, params),
      suppressed: (params: MemoryTypes.MemoryQuerySuppressedParams) => memoryQuerySuppressed(deps, params),
      snapshot: (params: Pick<MemoryTypes.MemoryQueryListParams, 'organizationId' | 'scope'>) => memoryQuerySnapshot(deps, params),
      list: (params: MemoryTypes.MemoryQueryListParams) => memoryQueryList(deps, params),
      get: (params: MemoryTypes.MemoryQueryGetParams) => memoryQueryGet(deps, params),
      export: (params: MemoryTypes.MemoryQueryExportParams) => memoryQueryExport(deps, params),
    },
    actions: {
      wipe: (params: MemoryTypes.MemoryActionWipeParams) => memoryActionWipe(deps, params),
      removeRoom: (params: TenantActionDeleteRoomParams) => memoryActionRemoveRoom(deps, params),
      save: (params: MemoryTypes.MemoryActionSaveParams) => memoryActionSave(deps, params),
      update: (params: MemoryTypes.MemoryActionUpdateParams) => memoryActionUpdate(deps, params),
      forget: (params: MemoryTypes.MemoryActionForgetParams) => memoryActionForget(deps, params),
      share: (params: MemoryTypes.MemoryActionShareParams) => memoryActionShare(deps, params),
    },
  };
}

export type MemoryService = ReturnType<typeof makeMemoryService>;
