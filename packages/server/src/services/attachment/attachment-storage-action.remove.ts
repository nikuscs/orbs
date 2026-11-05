import { rmdir, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { match } from 'ts-pattern';
import { attachmentStorageDirectory, attachmentStoragePath, attachmentStoragePosterPath } from './attachment-storage.utils';
import type { AttachmentStorageDeps, AttachmentStorageParams } from '../../types/attachment-storage.types';

export async function attachmentStorageActionRemove(deps: AttachmentStorageDeps, params: AttachmentStorageParams) {
  const path = await attachmentStoragePath(deps, params);

  try {
    await attachmentStorageDirectory(dirname(path));
    await unlink(path);
    await unlink(attachmentStoragePosterPath(path)).catch(() => undefined);
    await rmdir(dirname(path));
  } catch (error) {
    match(error)
      .with({ code: 'ENOENT' }, { code: 'ENOTEMPTY' }, () => undefined)
      .otherwise(() => {
        throw error;
      });
  }
}
