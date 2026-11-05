import { Errors } from '@repo/errors/universal';
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { dirname } from 'node:path';
import { match } from 'ts-pattern';
import { ATTACHMENT_STORAGE } from './attachment-storage.constants';
import { attachmentStorageDirectory, attachmentStoragePath, attachmentStoragePosterPath } from './attachment-storage.utils';
import type { AttachmentStorageDeps, AttachmentStorageParams } from '../../types/attachment-storage.types';

export async function attachmentStorageQueryPoster(deps: AttachmentStorageDeps, params: AttachmentStorageParams) {
  const path = await attachmentStoragePath(deps, params);

  try {
    await attachmentStorageDirectory(dirname(path));
    const file = await open(attachmentStoragePosterPath(path), constants.O_RDONLY | constants.O_NOFOLLOW);

    try {
      return new File([new Uint8Array(await file.readFile())], ATTACHMENT_STORAGE.posterName, { type: ATTACHMENT_STORAGE.posterMediaType });
    } finally {
      await file.close();
    }
  } catch (error) {
    return match(error)
      .with({ code: 'ENOENT' }, () => {
        throw new Errors.NOT_FOUND({ resource: 'attachment' });
      })
      .otherwise(() => {
        throw error;
      });
  }
}
