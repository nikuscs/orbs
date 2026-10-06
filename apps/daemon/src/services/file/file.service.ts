import { fileActionDownload } from './file-action.download';
import { fileActionPrune } from './file-action.prune';
import { fileActionRemoveRoom } from './file-action.remove-room';
import type * as FileTypes from '#/types/file.types';

export function makeFileService(deps: FileTypes.FileServiceDeps) {
  return {
    actions: {
      download: (params: FileTypes.FileActionDownloadParams) => fileActionDownload(deps, params),
      removeRoom: (params: FileTypes.FileActionRemoveRoomParams) => fileActionRemoveRoom(params),
      prune: (params: FileTypes.FileActionPruneParams) => fileActionPrune(params),
    },
  };
}

export type FileService = ReturnType<typeof makeFileService>;
