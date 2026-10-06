import { log } from '@orbs/logger/server';
import { STORAGE } from './storage.constants';
import type { StorageRemoveKeysParams, StorageServiceDeps } from '#/types/storage.types';

export async function storageActionRemoveKeys(deps: StorageServiceDeps, params: StorageRemoveKeysParams): Promise<void> {
  const batches = Array.from({ length: Math.ceil(params.keys.length / STORAGE.deleteBatchSize) }, (_, index) =>
    params.keys.slice(index * STORAGE.deleteBatchSize, (index + 1) * STORAGE.deleteBatchSize));

  try {
    await Promise.all(batches.map((keys) => deps.driver.removeKeys(keys)));
  } catch (error) {
    log.error({
      tag: 'file',
      message: 'Storage file deletion failed',
      error,
    });
    throw error;
  }
}
