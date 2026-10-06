import { match } from 'ts-pattern';
import { storageActionPut } from './storage-action.put';
import { storageActionRemoveKeys } from './storage-action.remove-keys';
import { storageActionRemoveRoom } from './storage-action.remove-room';
import { storageCloudflareDriver } from './storage-cloudflare.driver';
import { storageQueryGet } from './storage-query.get';
import { storageDriver } from './storage.driver';
import type * as StorageTypes from '#/types/storage.types';

export function makeStorageService(source: StorageTypes.StorageServiceSource) {
  const deps: StorageTypes.StorageServiceDeps = {
    driver: match(source)
      .with({ driver: 'cloudflare' }, ({ bucket }) => storageCloudflareDriver(bucket))
      .with({ driver: 'disk' }, ({ root }) => storageDriver({ root }))
      .exhaustive(),
  };

  return {
    queries: {
      get: (params: StorageTypes.StorageGetParams) => storageQueryGet(deps, params),
      list: deps.driver.list,
    },
    actions: {
      put: (params: StorageTypes.StoragePutParams) => storageActionPut(deps, params),
      removeKeys: (params: StorageTypes.StorageRemoveKeysParams) => storageActionRemoveKeys(deps, params),
      removeRoom: (params: StorageTypes.StorageRemoveRoomParams) => storageActionRemoveRoom(deps, params),
    },
  };
}

export type StorageService = ReturnType<typeof makeStorageService>;
