import { STORAGE } from './storage.constants';
import type { StorageGetParams, StorageObject, StorageServiceDeps } from '#/types/storage.types';

export function storageQueryGet(deps: StorageServiceDeps, params: StorageGetParams): Promise<StorageObject | null> {
  return deps.driver.get(`${STORAGE.roomKey(params.organizationId, params.roomId)}${params.fileId}`);
}
