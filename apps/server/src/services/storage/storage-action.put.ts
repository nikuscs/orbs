import { STORAGE } from './storage.constants';
import type { StoragePutParams, StorageServiceDeps } from '#/types/storage.types';

export async function storageActionPut(deps: StorageServiceDeps, params: StoragePutParams): Promise<void> {
  await deps.driver.put({
    key: `${STORAGE.roomKey(params.organizationId, params.roomId)}${params.fileId}`,
    body: params.file.stream(),
    contentType: params.file.type,
  });
}
