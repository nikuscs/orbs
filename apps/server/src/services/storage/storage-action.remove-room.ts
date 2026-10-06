import { storageActionRemoveKeys } from './storage-action.remove-keys';
import { STORAGE } from './storage.constants';
import type { StorageRemoveRoomParams, StorageServiceDeps } from '#/types/storage.types';

export async function storageActionRemoveRoom(deps: StorageServiceDeps, params: StorageRemoveRoomParams): Promise<void> {
  const prefix = STORAGE.roomKey(params.organizationId, params.roomId);

  async function storageRemovePage(cursor: string | undefined): Promise<void> {
    const page = await deps.driver.list({ prefix, cursor });

    await storageActionRemoveKeys(deps, { keys: page.keys });

    if (page.cursor) {
      await storageRemovePage(page.cursor);
    }
  }

  await storageRemovePage(undefined);
}
